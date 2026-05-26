// ============================================================
//  Myra AdBlock - Enhanced Content Script
//  Cosmetic filtering + Anti-adblock + YouTube + Element Picker
// ============================================================

(function () {
  'use strict';

  let enabledState = true;
  let whitelistState = [];

  // ---- Expanded Ad CSS Selectors ----
  const AD_SELECTORS = [
    // Generic ad containers
    '[id*="ad-container"]', '[id*="ad-wrapper"]', '[id*="ad-banner"]',
    '[id*="ad-slot"]', '[id*="google_ads"]', '[id*="dfp-"]',
    '[class*="ad-container"]', '[class*="ad-wrapper"]', '[class*="ad-banner"]',
    '[class*="ad-slot"]', '[class*="ad-unit"]', '[class*="advert"]',
    '[class*="sponsored"]', '[class*="promoted"]',

    // Google Ads
    'ins.adsbygoogle', '[data-ad-client]', '[data-ad-slot]',
    '.google-auto-placed', '#google_ads_frame', '.adsbygoogle',
    'div[data-google-query-id]',

    // Ad iframes
    'iframe[src*="doubleclick.net"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="ad"]', 'iframe[id*="google_ads"]',
    'iframe[src*="adserver"]', 'iframe[src*="adservice"]',

    // Social media ads
    '[data-testid="placementTracking"]', 'article[data-promoted="true"]',
    '[aria-label="Sponsored"]', '[aria-label="Advertisement"]',
    '[data-testid="tweet"][data-promoted]',

    // Pop-ups and overlays
    '[class*="popup-ad"]', '[class*="modal-ad"]', '[id*="overlay-ad"]',
    '[class*="interstitial"]',

    // Newsletter/notification popups
    '[class*="newsletter-popup"]', '[class*="notification-popup"]',
    '[class*="cookie-banner"]', '[id*="onetrust-consent-sdk"]',

    // Affiliate/sponsored
    '[class*="affiliate"]', '[data-affiliate]',
    '[class*="taboola"]', '[class*="outbrain"]',
    'div[id^="crt-"]', 'div[id^="trc_"]', '.OUTBRAIN',

    // YouTube ads
    '.video-ads', '.ytp-ad-module', '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay', '#player-ads',
    '.ytd-promoted-sparkles-web-renderer', '.ytd-ad-slot-renderer',
    '.ytd-in-feed-ad-layout-renderer', '.ytd-banner-promo-renderer',
    'ytd-ad-slot-renderer', 'ytd-promoted-sparkles-web-renderer',
    'ytd-in-feed-ad-layout-renderer', 'ytd-statement-banner-renderer',
    '#masthead-ad', 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',

    // Common ad networks leftover elements
    '[class*="adfox"]', '[id*="adfox"]',
    '[class*="adv-"]', '[id*="adv-"]',
    'amp-ad', 'amp-embed[type="ad"]',

    // Sticky/floating ads
    '[class*="sticky-ad"]', '[class*="floating-ad"]',
    '[class*="fixed-ad"]', '[id*="sticky-ad"]',
  ];

  // ---- Initialize ----
  function init() {
    chrome.storage.local.get(['enabled', 'whitelist'], (result) => {
      enabledState = result.enabled !== false;
      whitelistState = result.whitelist || [];

      if (!enabledState) return;
      if (whitelistState.includes(window.location.hostname)) return;

      applyCosmeticFilters();
      startMutationObserver();
      bypassAntiAdblock();
      handleYouTubeAds();
      applyCustomRules();
      reportBlockedCount();
    });
  }

  // ---- Cosmetic Filtering ----
  function applyCosmeticFilters() {
    const existing = document.getElementById('myra-adblock-css');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'myra-adblock-css';
    style.textContent = AD_SELECTORS.map(sel =>
      `${sel} { display: none !important; visibility: hidden !important; height: 0 !important; max-height: 0 !important; overflow: hidden !important; }`
    ).join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  // ---- MutationObserver for dynamic ads ----
  function startMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!enabledState) return;
      if (whitelistState.includes(window.location.hostname)) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          for (const selector of AD_SELECTORS) {
            try {
              if (node.matches && node.matches(selector)) {
                node.style.display = 'none';
                node.style.visibility = 'hidden';
              }
              if (node.querySelectorAll) {
                node.querySelectorAll(selector).forEach(el => {
                  el.style.display = 'none';
                  el.style.visibility = 'hidden';
                });
              }
            } catch (e) { }
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ---- Anti-Adblock Wall Bypass ----
  function bypassAntiAdblock() {
    const ANTI_ADBLOCK_SELECTORS = [
      '[class*="adblock"]', '[id*="adblock"]', '[class*="ad-block"]',
      '[class*="adb-overlay"]', '.modal-adblock', '#adblock-modal',
      '.adblock-message', '[class*="paywall"]', '[id*="paywall"]',
      '[class*="detect-adblock"]', '[id*="detect-adblock"]',
    ];

    function removeAntiAdblock() {
      if (!enabledState) return;
      ANTI_ADBLOCK_SELECTORS.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            if (text.includes('adblock') || text.includes('ad blocker') ||
                text.includes('disable your ad') || text.includes('whitelist us') ||
                text.includes('turn off your ad') || text.includes('please disable')) {
              el.remove();
            }
          });
        } catch (e) { }
      });
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    removeAntiAdblock();
    setInterval(removeAntiAdblock, 3000);
  }

  // ---- YouTube Ad Handling ----
  function handleYouTubeAds() {
    if (!window.location.hostname.includes('youtube.com')) return;

    let blockedYT = 0;

    function skipYouTubeAds() {
      if (!enabledState) return;

      // Auto-skip
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-overlay-close-button');
      if (skipBtn) { skipBtn.click(); blockedYT++; }

      // Remove overlays
      document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-text-overlay').forEach(el => {
        el.remove();
        blockedYT++;
      });

      // Speed through video ads
      const video = document.querySelector('video');
      if (video && document.querySelector('.ad-showing')) {
        video.currentTime = video.duration || 0;
        video.playbackRate = 16;
        blockedYT++;
      }

      // Remove ad banners in feed
      document.querySelectorAll('ytd-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, #masthead-ad').forEach(el => {
        el.remove();
        blockedYT++;
      });
    }

    setInterval(skipYouTubeAds, 300);

    // Report YouTube blocks periodically
    setInterval(() => {
      if (blockedYT > 0) {
        chrome.runtime.sendMessage({ type: 'CONTENT_BLOCKED', count: blockedYT });
        blockedYT = 0;
      }
    }, 5000);
  }

  // ---- Custom Rules ----
  function applyCustomRules() {
    chrome.storage.local.get(['customRules'], (result) => {
      const rules = result.customRules || [];
      const domainRules = rules.filter(r => r.domain === window.location.hostname);
      if (domainRules.length === 0) return;

      const style = document.createElement('style');
      style.id = 'myra-adblock-custom-css';
      style.textContent = domainRules.map(r => `${r.selector} { display: none !important; }`).join('\n');
      (document.head || document.documentElement).appendChild(style);
    });
  }

  // ---- Count blocked elements ----
  function reportBlockedCount() {
    let count = 0;
    AD_SELECTORS.forEach(sel => {
      try {
        count += document.querySelectorAll(sel).length;
      } catch (e) { }
    });

    if (count > 0) {
      chrome.runtime.sendMessage({ type: 'CONTENT_BLOCKED', count });
    }
  }

  // ---- Element Picker ----
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HIDE_ELEMENT') {
      document.querySelectorAll(message.selector).forEach(el => {
        el.style.display = 'none';
      });
      sendResponse({ success: true });
    }
    if (message.type === 'START_ELEMENT_PICKER') {
      startElementPicker();
      sendResponse({ success: true });
    }
  });

  let pickerActive = false;

  function startElementPicker() {
    if (pickerActive) return;
    pickerActive = true;

    const overlay = document.createElement('div');
    overlay.id = 'myra-picker-overlay';
    overlay.style.cssText = `
      position: fixed; pointer-events: none; z-index: 2147483647;
      border: 2px solid #e74c3c; background: rgba(231,76,60,0.15);
      transition: all 0.1s ease; border-radius: 4px;
    `;
    document.body.appendChild(overlay);

    const banner = document.createElement('div');
    banner.id = 'myra-picker-banner';
    banner.style.cssText = `
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; background: linear-gradient(135deg, #2c3e50, #34495e);
      color: white; padding: 12px 24px; border-radius: 10px;
      font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4); pointer-events: none;
    `;
    banner.textContent = '🎯 Click an element to block | Press ESC to cancel';
    document.body.appendChild(banner);

    function onMouseOver(e) {
      const el = e.target;
      if (el === overlay || el === banner) return;
      const rect = el.getBoundingClientRect();
      Object.assign(overlay.style, {
        top: rect.top + 'px', left: rect.left + 'px',
        width: rect.width + 'px', height: rect.height + 'px'
      });
    }

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const el = e.target;
      if (el === overlay || el === banner) return;

      let selector = el.tagName.toLowerCase();
      if (el.id) selector = '#' + el.id;
      else if (el.className && typeof el.className === 'string')
        selector = '.' + el.className.trim().split(/\s+/).join('.');

      el.style.display = 'none';

      chrome.storage.local.get(['customRules'], (result) => {
        const rules = result.customRules || [];
        rules.push({
          domain: window.location.hostname, selector,
          url: window.location.href, timestamp: Date.now()
        });
        chrome.storage.local.set({ customRules: rules });
      });

      cleanup();
    }

    function onKeyDown(e) { if (e.key === 'Escape') cleanup(); }

    function cleanup() {
      pickerActive = false;
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      banner.remove();
    }

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  // ---- Listen for toggle changes ----
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      enabledState = changes.enabled.newValue;
      if (enabledState) {
        applyCosmeticFilters();
      } else {
        const css = document.getElementById('myra-adblock-css');
        if (css) css.remove();
      }
    }
    if (changes.whitelist) {
      whitelistState = changes.whitelist.newValue || [];
    }
  });

  // ---- Start! ----
  init();

})();
