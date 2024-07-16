document.addEventListener('DOMContentLoaded', () => {
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const status = document.getElementById('status');

    // Load saved settings
    chrome.storage.sync.get('targetLanguage', (data) => {
      if (data.targetLanguage) {
        targetLanguageSelect.value = data.targetLanguage;
      }
    });

    // Save settings when selection changes
    targetLanguageSelect.addEventListener('change', () => {
      const targetLanguage = targetLanguageSelect.value;
      chrome.storage.sync.set({ targetLanguage }, () => {
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 1000);
      });
    });
  });