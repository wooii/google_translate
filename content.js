// content.js

(function() {
  let popup = null;
  let voices = [];

  function getSelectionPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY + rect.height,
      };
    }
    return { left: 0, top: 0 };
  }

  function addSearchIcon() {
    document.querySelector('#search-icon')?.remove();

    const position = getSelectionPosition();

    const searchIcon = document.createElement('div');
    searchIcon.id = 'search-icon';
    searchIcon.innerHTML = '🔍';
    Object.assign(searchIcon.style, {
      position: 'fixed',
      backgroundColor: '#FFF',
      border: '1px solid #ccc',
      borderRadius: '50%',
      padding: '5px',
      boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
      cursor: 'pointer',
      zIndex: '2147483646',
      left: `${position.left + 5}px`,
      top: `${position.top - window.scrollY}px`,
    });
    document.body.appendChild(searchIcon);

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    searchIcon.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    searchIcon.addEventListener('mouseup', (event) => {
      selection.removeAllRanges();
      selection.addRange(range);

      const selectedText = selection.toString();

      chrome.runtime.sendMessage({ action: 'translate', text: selectedText }, () => {});

      searchIcon.remove();
    });

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (selection.isCollapsed || selection.toString() === '') {
        searchIcon.remove();
        document.removeEventListener('selectionchange', onSelectionChange);
      }
    };

    document.addEventListener('selectionchange', onSelectionChange);
  }

  document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection().toString();
    if (selectedText.length > 0) {
      addSearchIcon();
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translate') {
      translateText(request.text);
      sendResponse({ status: 'Translating' });
    }
  });

  function translateText(selectedText) {
    if (popup) {
      popup.remove();
    }

    popup = document.createElement('div');
    popup.id = 'translation-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <span id="selected-text">${selectedText}</span>
        <button id="pronounce-button">🔊</button>
        <p id="translation-text"> </p>
      </div>
    `;
    document.body.appendChild(popup);

    getVoices();

    requestAnimationFrame(() => {
      setPopupPosition();
      addPopupEventListeners();
    });

    chrome.storage.sync.get('targetLanguage', (data) => {
      const targetLanguage = data.targetLanguage || 'en';
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(selectedText)}`)
        .then(response => response.json())
        .then(data => {
          const translation = data[0][0][0];
          const translateUrl = `https://translate.google.com/?sl=auto&tl=${targetLanguage}&text=${encodeURIComponent(selectedText)}&op=translate`;

          if (popup) {
            requestAnimationFrame(() => {
              popup.querySelector('.popup-content').innerHTML = `
                <span id="selected-text">${selectedText}</span>
                <button id="pronounce-button">🔊</button>
                <p id="translation-text">${translation}</p>
                <a href="${translateUrl}" target="_blank">More</a>
              `;
              setVoiceForPronunciation(selectedText);
              adjustPopupSize();
            });
          }
        })
        .catch(error => {
          if (popup) {
            requestAnimationFrame(() => {
              popup.querySelector('#translation-text').innerText = 'Error translating text';
            });
          }
        });
    });
  }

  function getVoices() {
    voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
      };
    }
  }

  function setVoiceForPronunciation(text) {
    requestAnimationFrame(() => {
      const pronounceButton = popup.querySelector('#pronounce-button');
      if (pronounceButton) {
        pronounceButton.addEventListener('click', (event) => {
          event.stopPropagation();
          const utterance = new SpeechSynthesisUtterance(text);
          const femaleVoice = voices.find(voice => voice.name.includes('Google UK English Female') || voice.gender === 'female');
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          speechSynthesis.speak(utterance);
        });
      }
    });
  }

  function getSelectionRect() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.bottom,
        width: rect.width,
      };
    }
    return { left: 0, top: 0, width: 0 };
  }

  function adjustPopupSize() {
    if (!popup) return;

    const selectionRect = getSelectionRect();
    const popupContent = popup.querySelector('.popup-content');

    const minWidth = Math.max(selectionRect.width, 200);
    popup.style.minWidth = `${minWidth}px`;
    popup.style.maxWidth = '400px';

    setPopupPosition();
  }

  function setPopupPosition() {
    if (!popup) return;

    const selectionRect = getSelectionRect();

    popup.style.position = 'fixed';
    popup.style.left = `${selectionRect.left}px`;
    popup.style.top = `${selectionRect.top}px`;

    const rightEdge = selectionRect.left + popup.offsetWidth;
    if (rightEdge > window.innerWidth) {
      popup.style.left = `${window.innerWidth - popup.offsetWidth - 5}px`;
    }

    if (parseInt(popup.style.top) < 0) {
      popup.style.top = '0px';
    }

    // Ensure the popup is fully visible
    const popupRect = popup.getBoundingClientRect();
    if (popupRect.bottom > window.innerHeight) {
      popup.style.top = `${window.innerHeight - popupRect.height}px`;
    }
  }

  function addPopupEventListeners() {
    if (!popup) return;

    const closePopup = (event) => {
      if (event.target.id !== 'pronounce-button') {
        popup.remove();
        popup = null;
      }
    };

    popup.addEventListener('click', closePopup);

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (selection.isCollapsed) {
        popup.remove();
        popup = null;
        document.removeEventListener('selectionchange', onSelectionChange);
      }
    };

    document.addEventListener('selectionchange', onSelectionChange);
  }

  const styles = `
    #translation-popup {
      position: fixed;
      background-color: white;
      border: 1px solid #ccc;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      z-index: 2147483647;
      padding: 10px;
      font-family: Arial, sans-serif;
      cursor: pointer;
    }
    .popup-content {
      font-size: 14px;
      color: black;
    }
    .popup-content a {
      display: block;
      margin-top: 10px;
      text-decoration: none;
      color: #1a73e8;
    }
    .popup-content a:hover {
      text-decoration: underline;
    }
    #selected-text {
      font-weight: bold;
      margin-right: 5px;
    }
    #pronounce-button {
      background-color: #1a73e8;
      color: white;
      border: none;
      padding: 5px 10px;
      cursor: pointer;
      border-radius: 5px;
    }
    #pronounce-button:hover {
      background-color: #155ab6;
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
})();