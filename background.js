// background.js

const TRANSLATE = 'translate';
const DEFAULT_TARGET_LANGUAGE = 'en';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: TRANSLATE,
    title: "Translate",
    contexts: ["selection"]
  });

  chrome.storage.sync.get('targetLanguage', ({ targetLanguage }) => {
    if (!targetLanguage) {
      chrome.storage.sync.set({ targetLanguage: DEFAULT_TARGET_LANGUAGE });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === TRANSLATE) {
    handleTranslate(info.selectionText, tab.id);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === TRANSLATE) {
    handleTranslate(request.text, sender.tab.id);
  }
});

function handleTranslate(text, tabId) {
  chrome.tabs.sendMessage(tabId, { action: TRANSLATE, text });
}
