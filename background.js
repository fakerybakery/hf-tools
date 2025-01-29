chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'MODEL_PAGE') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['model.js']
    });
  }
});

// Reload content when settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    chrome.tabs.query({url: 'https://*.huggingface.co/*'}, (tabs) => {
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['model.js']
        });
      });
    });
  }
}); 