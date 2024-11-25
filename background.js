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
