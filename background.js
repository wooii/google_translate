// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translate",
    title: "Translate to Chinese",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate") {
    const selectedText = info.selectionText;
    chrome.tabs.sendMessage(tab.id, { action: 'translate', text: selectedText });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    chrome.tabs.sendMessage(sender.tab.id, { action: 'translate', text: request.text });
  }
});
