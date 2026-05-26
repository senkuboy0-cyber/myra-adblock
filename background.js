// ============================================================
// Myra AdBlock - Background Service Worker
// ============================================================

// Track blocked requests count
let totalBlocked = 0;

// Initialize blocked count from storage
chrome.storage.local.get(['totalBlocked', 'enabled', 'whitelist'], (result) => {
  if (result.totalBlocked !== undefined) {
    totalBlocked = result.totalBlocked;
  }
  if (result.enabled === undefined) {
    chrome.storage.local.set({ enabled: true });
  }
  if (result.whitelist === undefined) {
    chrome.storage.local.set({ whitelist: [] });
  }
});

// Listen for blocked requests via declarativeNetRequest
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  totalBlocked++;
  // Save periodically (every 10 blocks to reduce storage writes)
  if (totalBlocked % 10 === 0) {
    chrome.storage.local.set({ totalBlocked });
  }
  // Update badge
  updateBadge();
});

function updateBadge() {
  const text = totalBlocked > 999 ? '999+' : String(totalBlocked);
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATS':
      sendResponse({ totalBlocked });
      break;

    case 'RESET_STATS':
      totalBlocked = 0;
      chrome.storage.local.set({ totalBlocked: 0 });
      updateBadge();
      sendResponse({ success: true });
      break;

    case 'TOGGLE_ENABLED':
      chrome.storage.local.get(['enabled'], (result) => {
        const newState = !result.enabled;
        chrome.storage.local.set({ enabled: newState });
        updateDynamicRules(newState);
        sendResponse({ enabled: newState });
      });
      return true; // async response

    case 'GET_ENABLED':
      chrome.storage.local.get(['enabled'], (result) => {
        sendResponse({ enabled: result.enabled !== false });
      });
      return true;

    case 'ADD_WHITELIST':
      chrome.storage.local.get(['whitelist'], (result) => {
        const whitelist = result.whitelist || [];
        if (!whitelist.includes(message.domain)) {
          whitelist.push(message.domain);
          chrome.storage.local.set({ whitelist });
        }
        sendResponse({ whitelist });
      });
      return true;

    case 'REMOVE_WHITELIST':
      chrome.storage.local.get(['whitelist'], (result) => {
        let whitelist = result.whitelist || [];
        whitelist = whitelist.filter(d => d !== message.domain);
        chrome.storage.local.set({ whitelist });
        sendResponse({ whitelist });
      });
      return true;

    case 'GET_WHITELIST':
      chrome.storage.local.get(['whitelist'], (result) => {
        sendResponse({ whitelist: result.whitelist || [] });
      });
      return true;

    case 'BLOCK_ELEMENT':
      // Forward to content script to hide an element
      chrome.tabs.sendMessage(message.tabId, {
        type: 'HIDE_ELEMENT',
        selector: message.selector
      });
      sendResponse({ success: true });
      break;
  }
});

// Toggle all dynamic rules on/off
async function updateDynamicRules(enabled) {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    if (enabled) {
      // Re-enable rules
      const updateRules = rules.map(r => ({
        id: r.id,
        priority: r.priority,
        action: r.action,
        condition: r.condition
      }));
      if (updateRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: rules.map(r => r.id),
          addRules: updateRules
        });
      }
    } else {
      // Disable all rules
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id)
      });
    }
  } catch (e) {
    console.error('Error updating rules:', e);
  }
}

// Initialize badge on startup
updateBadge();
