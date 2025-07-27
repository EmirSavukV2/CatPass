// Background script for CatPass extension
console.log('CatPass background script loaded');

// Keep service worker alive
self.addEventListener('install', (event) => {
  console.log('CatPass extension installed');
});

self.addEventListener('activate', (event) => {
  console.log('CatPass extension activated');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'openWebApp') {
    chrome.tabs.create({
      url: 'http://localhost:3000'
    });
    sendResponse({ success: true });
  }
  
  return true;
});
