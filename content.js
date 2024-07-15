// content.js

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

  // Function to add a search icon next to the selected text
  function addSearchIcon() {
    // Remove any existing search icon
    document.querySelector('#search-icon')?.remove();

    // Get the position of the selected text
    const position = getSelectionPosition();

    // Create the search icon element
    const searchIcon = document.createElement('div');
    searchIcon.id = 'search-icon';
    searchIcon.innerHTML = '🔍';
    Object.assign(searchIcon.style, {
      position: 'absolute',
      backgroundColor: '#FFF',
      border: '1px solid #ccc',
      borderRadius: '50%',
      padding: '5px',
      boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
      cursor: 'pointer',
      zIndex: '1000',
      left: `${position.left + 5}px`,
      top: `${position.top}px`,
    });
    document.body.appendChild(searchIcon);

    // Preserve the selection range
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    searchIcon.addEventListener('mousedown', (event) => {
      // Prevent the default action to avoid losing the selection
      event.preventDefault();
    });

    searchIcon.addEventListener('mouseup', (event) => {
      // Restore the selection range
      selection.removeAllRanges();
      selection.addRange(range);

      const selectedText = selection.toString();

      chrome.runtime.sendMessage({ action: 'translate', text: selectedText }, (response) => { });

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

  // Add event listener for mouseup event to detect text selection
  document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection().toString();
    if (selectedText.length > 0) {
      addSearchIcon();
    }
  });

  // Listener for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translate') {
      translateText(request.text);
      sendResponse({ status: 'Translating' });
    }
  });

  // Function to translate the text
  function translateText(selectedText) {
    // Remove any existing pop-up
    const existingPopup = document.querySelector('#translation-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create the new pop-up element
    const popup = document.createElement('div');
    popup.id = 'translation-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <span id="selected-text">${selectedText}</span>
        <button id="pronounce-button">🔊</button>
        <p> </p>
      </div>
    `;
    document.body.appendChild(popup);

    // Store the available voices and listen for changes
    let voices = [];
    const getVoices = () => {
      voices = window.speechSynthesis.getVoices();
      // Check if we already have the voices
      if (voices.length) {
        setVoiceForPronunciation(selectedText);
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          setVoiceForPronunciation(selectedText);
        };
      }
    };
    getVoices();

    // Function to set the female voice
    function setVoiceForPronunciation(text) {
      document.getElementById('pronounce-button').addEventListener('click', (event) => {
        event.stopPropagation();  // Prevent the popup from closing
        const utterance = new SpeechSynthesisUtterance(text);
        // Find and set a female voice
        const femaleVoice = voices.find(voice => voice.name.includes('Google UK English Female') || voice.gender === 'female');
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
        speechSynthesis.speak(utterance);
      });
    }

    // Fetch the translation from the Google Translate API
    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(selectedText)}`)
      .then(response => response.json())
      .then(data => {
        const translation = data[0][0][0];
        const translateUrl = `https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(selectedText)}&op=translate`;
        document.querySelector('#translation-popup .popup-content').innerHTML = `
          <span id="selected-text">${selectedText}</span>
          <button id="pronounce-button">🔊</button>
          <p>${translation}</p>
          <a href="${translateUrl}" target="_blank">More</a>
        `;
        setVoiceForPronunciation(selectedText);

        // Adjust popup size after content is loaded
        adjustPopupSize();
      })
      .catch(error => {
        document.querySelector('#translation-popup .popup-content').innerText = 'Error translating text';
      });

    // Function to get the position and size of the selected text
    function getSelectionRect() {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        return {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY + rect.height,
          width: rect.width,
        };
      }
      return { left: 0, top: 0, width: 0 };
    }

    // Function to adjust popup size
    function adjustPopupSize() {
        const selectionRect = getSelectionRect();
        const popupContent = popup.querySelector('.popup-content');

        // Set minimum width to selection width or 200px, whichever is larger
        const minWidth = Math.max(selectionRect.width, 200);
        popup.style.minWidth = `${minWidth}px`;
        popup.style.maxWidth = '400px'; // Set a maximum width to prevent oversized popups

        // Adjust popup position to cover the search button
        popup.style.left = `${selectionRect.left}px`;
        popup.style.top = `${selectionRect.top}px`; // Move it up slightly to cover the search button

        // Check if popup goes beyond the right edge of the viewport
        const rightEdge = selectionRect.left + popup.offsetWidth;
        if (rightEdge > window.innerWidth) {
          popup.style.left = `${window.innerWidth - popup.offsetWidth - 5}px`;
        }

        // Check if popup goes beyond the top edge of the viewport
        if (parseInt(popup.style.top) < 0) {
          popup.style.top = '0px';
        }
      }

    // Add styles for the pop-up
    const styles = `
      #translation-popup {
        position: absolute;
        background-color: white;
        border: 1px solid #ccc;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        z-index: 10000;
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

    // Close the pop-up when clicked
    const closePopup = (event) => {
      if (event.target.id !== 'pronounce-button') {
        popup.remove();
      }
    };

    popup.addEventListener('click', closePopup);

    // Remove the pop-up when the selection is changed
    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (selection.isCollapsed) {
        popup.remove();
        document.removeEventListener('selectionchange', onSelectionChange);
      }
    };

    document.addEventListener('selectionchange', onSelectionChange);
  }