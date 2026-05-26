// ============================================================
// Myra AdBlock - Content Script
// Cosmetic filtering + Element picker + Anti-adblock bypass
// ============================================================

(function () {
  'use strict';

  // ---- Common Ad CSS Selectors (cosmetic filtering) ----
  const AD_SELECTORS = [
    // Generic ad containers
    '[id*="ad-container"]',
    '[id*="ad-wrapper"]',
    '[id*="ad-banner"]',
    '[id*="ad-slot"]',
    '[id*="google_ads"]',
    '[id*="dfp-"]',
    '[class*="ad-container"]',
    '[class*="ad-wrapper"]',
    '[class*="ad-banner"]',
    '[class*="ad-slot"]',
    '[class*="ad-unit"]',
    '[class*="advert"]',
    '[class*="sponsored"]',
    '[class*="promoted"]',

    // Google Ads
    'ins.adsbygoogle',
    '[data-ad-client]',
    '[data-ad-slot]',
    '.google-auto-placed',
    '#google_ads_frame',
    '.adsbygoogle',

    // Common ad iframes
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="ad"]',
    'iframe[id*="google_ads"]',

    // Social media ads
    '[data-testid="placementTracking"]',
    'article[data-promoted="true"]',
    '[aria-label="Sponsored"]',
    '[aria-label="Advertisement"]',

    // Pop-ups and overlays
    '[class*="popup-ad"]',
    '[class*="modal-ad"]',
    '[id*="overlay-ad"]',
    '[class*="interstitial"]',

    // Newsletter/notification popups
    '[class*="newsletter-popup"]',
    '[class*="notification-popup"]',
    '[class*="cookie-banner"]',
    '[id*="onetrust-consent-sdk"]',

    // Affiliate/sponsored content
    '[class*="affiliate"]',
    '[data-affiliate]',
    '[class*="taboola"]',
    '[class*="outbrain"]',
    'div[id^="crt-"]',
    'div[id^="trc_"]',
    '.OUTBRAIN',

    // YouTube ads
    '.video-ads',
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '#player-ads',
    '.ytd-promoted-sparkles-web-renderer',
    '.ytd-ad-slot-renderer',
    '.ytd-in-feed-ad-layout-renderer',
    '.ytd-banner-promo-renderer',
    'ytd-ad-slot-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-statement-banner-renderer',
  ];

  // ---- Main Cosmetic Filter ----
  function applyCosmeticFilters() {
    // Check if site is whitelisted
    const currentDomain = window.location.hostname;
    chrome.storage.local.get(['enabled', 'whitelist'], (result) => {
      if (result.enabled === false) return;
      const whitelist = result.whitelist || [];
      if (whitelist.includes(currentDomain)) return;

      // Apply CSS rules to hide ad elements
      const style = document.createElement('style');
      style.id = 'myra-adblock-css';
      style.textContent = AD_SELECTORS.map(sel => `${sel} { display: none !important; }`).join('\n');
      (document.head || document.documentElement).appendChild(style);
    });
  }

  // ---- Dynamic Mutation Observer (catch dynamically loaded ads) ----
  function startMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      chrome.storage.local.get(['enabled', 'whitelist'], (result) => {
        if (result.enabled === false) return;
        const whitelist = result.whitelist || [];
        if (whitelist.includes(window.location.hostname)) return;

        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue; // only elements
            // Check if the added node or its children match ad selectors
            for (const selector of AD_SELECTORS) {
              try {
                if (node.matches && node.matches(selector)) {
                  node.style.display = 'none';
                }
                if (node.querySelectorAll) {
                  node.querySelectorAll(selector).forEach(el => {
                    el.style.display = 'none';
                  });
                }
              } catch (e) { /* ignore invalid selectors */ }
            }
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ---- Anti-Adblock Wall Bypass ----
  function bypassAntiAdblock() {
    // Remove common anti-adblock overlays
    const ANTI_ADBLOCK_SELECTORS = [
      '[class*="adblock"]',
      '[id*="adblock"]',
      '[class*="ad-block"]',
      '[class*="adb-overlay"]',
      '.modal-adblock',
      '#adblock-modal',
      '.adblock-message',
      '[class*="paywall"]',
      '[id*="paywall"]',
    ];

    function removeAntiAdblock() {
      chrome.storage.local.get(['enabled'], (result) => {
        if (result.enabled === false) return;
        ANTI_ADBLOCK_SELECTORS.forEach(sel => {
          try {
            document.querySelectorAll(sel).forEach(el => {
              // Check if it looks like an anti-adblock wall
              const text = (el.textContent || '').toLowerCase();
              if (text.includes('adblock') || text.includes('ad blocker') ||
                  text.includes('disable your ad') || text.includes('whitelist us') ||
                  text.includes('turn off your ad')) {
                el.remove();
              }
            });
          } catch (e) { /* ignore */ }
        });

        // Re-enable scrolling if it was disabled
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      });
    }

    // Run periodically for SPAs
    removeAntiAdblock();
    setInterval(removeAntiAdblock, 3000);
  }

  // ---- YouTube-specific ad handling ----
  function handleYouTubeAds() {
    if (!window.location.hostname.includes('youtube.com')) return;

    function skipYouTubeAds() {
      // Auto-skip video ads
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-overlay-close-button');
      if (skipBtn) skipBtn.click();

      // Remove ad overlays
      document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-text-overlay').forEach(el => el.remove());

      // Speed up ad playback
      const video = document.querySelector('video');
      if (video && document.querySelector('.ad-showing')) {
        video.currentTime = video.duration || 0;
        video.playbackRate = 16;
      }
    }

    setInterval(skipYouTubeAds, 500);
  }

  // ---- Element Picker (for manual ad blocking) ----
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
  let pickerOverlay = null;

  function startElementPicker() {
    if (pickerActive) return;
    pickerActive = true;

    // Create overlay highlight
    pickerOverlay = document.createElement('div');
    pickerOverlay.id = 'myra-picker-overlay';
    pickerOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      border: 2px solid #e74c3c;
      background: rgba(231, 76, 60, 0.15);
      transition: all 0.1s ease;
    `;
    document.body.appendChild(pickerOverlay);

    // Show instruction banner
    const banner = document.createElement('div');
    banner.id = 'myra-picker-banner';
    banner.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #2c3e50;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    banner.textContent = '🎯 Click on an element to block it | Press ESC to cancel';
    document.body.appendChild(banner);

    function onMouseOver(e) {
      const el = e.target;
      if (el.id === 'myra-picker-overlay' || el.id === 'myra-picker-banner') return;
      const rect = el.getBoundingClientRect();
      pickerOverlay.style.top = rect.top + 'px';
      pickerOverlay.style.left = rect.left + 'px';
      pickerOverlay.style.width = rect.width + 'px';
      pickerOverlay.style.height = rect.height + 'px';
    }

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const el = e.target;
      if (el.id === 'myra-picker-overlay' || el.id === 'myra-picker-banner') return;

      // Generate a CSS selector for the element
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector = '#' + el.id;
      } else if (el.className && typeof el.className === 'string') {
        selector = '.' + el.className.trim().split(/\s+/).join('.');
      }

      // Hide the element
      el.style.display = 'none';

      // Store the custom rule
      chrome.storage.local.get(['customRules'], (result) => {
        const rules = result.customRules || [];
        rules.push({
          domain: window.location.hostname,
          selector: selector,
          url: window.location.href,
          timestamp: Date.now()
        });
        chrome.storage.local.set({ customRules: rules });
      });

      cleanup();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') cleanup();
    }

    function cleanup() {
      pickerActive = false;
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      pickerOverlay?.remove();
      banner?.remove();
    }

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  // ---- Apply custom user rules ----
  function applyCustomRules() {
    chrome.storage.local.get(['customRules', 'enabled', 'whitelist'], (result) => {
      if (result.enabled === false) return;
      const whitelist = result.whitelist || [];
      if (whitelist.includes(window.location.hostname)) return;

      const rules = result.customRules || [];
      const domainRules = rules.filter(r => r.domain === window.location.hostname);
      if (domainRules.length === 0) return;

      const style = document.createElement('style');
      style.id = 'myra-adblock-custom-css';
      style.textContent = domainRules.map(r => `${r.selector} { display: none !important; }`).join('\n');
      (document.head || document.documentElement).appendChild(style);
    });
  }

  // ---- Count blocked elements on page ----
  function countBlockedElements() {
    let count = 0;
    AD_SELECTORS.forEach(sel => {
      try {
        count += document.querySelectorAll(sel).length;
      } catch (e) { /* ignore */ }
    });
    return count;
  }

  // ---- Initialize everything ----
  applyCosmeticFilters();
  startMutationObserver();
  bypassAntiAdblock();
  handleYouTubeAds();
  applyCustomRules();

  // Report blocked count back to background
  window.addEventListener('load', () => {
    const blocked = countBlockedElements();
    if (blocked > 0) {
      chrome.runtime.sendMessage({
        type: 'PAGE_BLOCKED_COUNT',
        count: blocked
      });
    }
  });

})();
