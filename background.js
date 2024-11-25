// background.js

// Listen for tab activation (when the user switches tabs)
chrome.tabs.onActivated.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

// Listen for tab updates (when the page is refreshed or navigated)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.action.setBadgeText({ text: "" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open-popup") {
    // Open the popup programmatically
    chrome.action.openPopup();
  } else if (message.action === "set-badge") {
    // Set the badge text and color
    chrome.action.setBadgeText({ text: message.text });
    chrome.action.setBadgeBackgroundColor({
      color: message.color || "#28a745",
    });
  } else if (message.action === "clear-badge") {
    // Clear the badge text
    chrome.action.setBadgeText({ text: "" });
  }
});
