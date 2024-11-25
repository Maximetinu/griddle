chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open-popup") {
    // Open the popup programmatically
    chrome.action.openPopup();
  }
});
