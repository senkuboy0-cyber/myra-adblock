// ============================================================
//  Myra AdBlock - Background Service Worker (Enhanced)
//  Tracks blocked ads & trackers separately
// ============================================================

// Stats tracking
let stats = {
  totalBlocked: 0,
  adsBlocked: 0,
  trackersBlocked: 0,
  todayBlocked: 0,
  lastResetDate: new Date().toDateString(),
  domainStats: {}  // per-domain stats
};

// Known ad domains for categorization
const AD_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adservice.google.com', 'pagead2.googlesyndication.com', 'ads.youtube.com',
  'amazon-adsystem.com', 'ads.yahoo.com', 'ad.doubleclick.net',
  'ads-twitter.com', 'ads.linkedin.com', 'adnxs.com', 'taboola.com',
  'outbrain.com', 'criteo.com', 'popads.net', 'popcash.net', 'adcolony.com',
  'pubmatic.com', 'openx.net', 'rubiconproject.com', 'casalemedia.com',
  'serving-sys.com', 'moatads.com', 'adrecover.com', 'adblade.com',
  'zedo.com', 'revjet.com', 'trafficjunky.com', 'juicyads.com',
  'exoclick.com', 'mgid.com', 'propellerads.com', 'hilltopads.com',
  'clickadu.com', 'adsterra.com', 'infolinks.com', 'mediavine.com',
  'monumetric.com', 'vungle.com', 'applovin.com', 'chartboost.com'
];

const TRACKER_DOMAINS = [
  'facebook.com/tr', 'connect.facebook.net', 'analytics.google.com',
  'google-analytics.com', 'hotjar.com', 'clarity.ms', 'mixpanel.com',
  'segment.com', 'amplitude.com', 'fullstory.com', 'mouseflow.com',
  'crazyegg.com', 'luckyorange.com', 'matomo.org', 'pixel.facebook.com',
  'snap.licdn.com', 'bat.bing.com', 't.co/i/adsct'
];

function isAdDomain(url) {
  return AD_DOMAINS.some(d => url.includes(d));
}

function isTrackerDomain(url) {
  return TRACKER_DOMAINS.some(d => url.includes(d));
}

// Initialize from storage
chrome.storage.local.get(['stats'], (result) => {
  if (result.stats) {
    stats = { ...stats, ...result.stats };
    // Reset daily count if new day
    if (stats.lastResetDate !== new Date().toDateString()) {
      stats.todayBlocked = 0;
      stats.lastResetDate = new Date().toDateString();
    }
  }
  updateBadge();
});

// Listen for declarativeNetRequest rule matches
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const url = info.request.url || '';
    const tabId = info.request.tabId;

    stats.totalBlocked++;

    if (isAdDomain(url)) {
      stats.adsBlocked++;
    } else if (isTrackerDomain(url)) {
      stats.trackersBlocked++;
    } else {
      stats.adsBlocked++; // default to ads
    }

    stats.todayBlocked++;

    // Per-tab stats
    if (tabId && tabId > 0) {
      const domain = getDomainFromUrl(url);
      if (domain) {
        if (!stats.domainStats[domain]) {
          stats.domainStats[domain] = 0;
        }
        stats.domainStats[domain]++;
      }
    }

    // Save every 5 blocks
    if (stats.totalBlocked % 5 === 0) {
      saveStats();
    }
    updateBadge();
  });
}

// Also track via webNavigation for content script blocks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATS':
      sendResponse({ stats });
      break;

    case 'CONTENT_BLOCKED':
      // Content script reported blocked elements
      const count = message.count || 0;
      stats.totalBlocked += count;
      stats.adsBlocked += count;
      stats.todayBlocked += count;
      saveStats();
      updateBadge();
      sendResponse({ success: true });
      break;

    case 'RESET_STATS':
      stats = {
        totalBlocked: 0,
        adsBlocked: 0,
        trackersBlocked: 0,
        todayBlocked: 0,
        lastResetDate: new Date().toDateString(),
        domainStats: {}
      };
      saveStats();
      updateBadge();
      sendResponse({ success: true });
      break;

    case 'TOGGLE_ENABLED':
      chrome.storage.local.get(['enabled'], (result) => {
        const newState = !(result.enabled !== false);
        chrome.storage.local.set({ enabled: newState });
        sendResponse({ enabled: newState });
      });
      return true;

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
  }
});

function saveStats() {
  chrome.storage.local.set({ stats });
}

function updateBadge() {
  const text = stats.totalBlocked > 999 ? '999+' : String(stats.totalBlocked);
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Initialize badge
updateBadge();
