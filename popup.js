// ============================================================
//  Myra AdBlock - Popup Script (Enhanced)
//  Animated stats, toggle, whitelist, element picker
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const totalEl = document.getElementById('totalBlocked');
  const adsEl = document.getElementById('adsBlocked');
  const trackersEl = document.getElementById('trackersBlocked');
  const allTimeEl = document.getElementById('allTimeBlocked');
  const progressFill = document.getElementById('progressFill');
  const protectionText = document.getElementById('protectionText');
  const masterToggle = document.getElementById('masterToggle');
  const elementPickerBtn = document.getElementById('elementPickerBtn');
  const whitelistBtn = document.getElementById('whitelistBtn');
  const resetBtn = document.getElementById('resetBtn');
  const currentDomainEl = document.getElementById('currentDomain');
  const siteBlockedEl = document.getElementById('siteBlocked');
  const statusDot = document.querySelector('.status-dot');

  // ---- Animated Counter ----
  function animateCount(element, target, duration = 800) {
    const start = parseInt(element.textContent) || 0;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toLocaleString();
        element.classList.add('counting');
        setTimeout(() => element.classList.remove('counting'), 300);
      }
    }

    requestAnimationFrame(update);
  }

  // ---- Load Stats ----
  function loadStats() {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
      if (!response || !response.stats) return;
      const s = response.stats;

      animateCount(totalEl, s.todayBlocked || 0);
      animateCount(adsEl, s.adsBlocked || 0);
      animateCount(trackersEl, s.trackersBlocked || 0);
      animateCount(allTimeEl, s.totalBlocked || 0);

      // Progress bar based on blocked count
      const total = s.totalBlocked || 0;
      let percent = Math.min((total / 500) * 100, 100);
      setTimeout(() => {
        progressFill.style.width = percent + '%';
      }, 300);

      // Protection text
      if (total > 1000) {
        protectionText.textContent = 'Maximum';
        protectionText.style.color = '#2ecc71';
      } else if (total > 500) {
        protectionText.textContent = 'High';
        protectionText.style.color = '#3498db';
      } else if (total > 100) {
        protectionText.textContent = 'Medium';
        protectionText.style.color = '#f39c12';
      } else {
        protectionText.textContent = 'Building';
        protectionText.style.color = '#e74c3c';
      }
    });
  }

  // ---- Load Enabled State ----
  function loadEnabled() {
    chrome.runtime.sendMessage({ type: 'GET_ENABLED' }, (response) => {
      if (!response) return;
      masterToggle.checked = response.enabled;
      if (!response.enabled) {
        document.body.classList.add('disabled');
      } else {
        document.body.classList.remove('disabled');
      }
    });
  }

  // ---- Toggle On/Off ----
  masterToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED' }, (response) => {
      if (response) {
        masterToggle.checked = response.enabled;
        if (response.enabled) {
          document.body.classList.remove('disabled');
        } else {
          document.body.classList.add('disabled');
        }
      }
    });
  });

  // ---- Get Current Tab Domain ----
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentDomainEl.textContent = url.hostname;
      } catch {
        currentDomainEl.textContent = 'N/A';
      }
    }
  });

  // ---- Element Picker ----
  elementPickerBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_ELEMENT_PICKER' });
        window.close();
      }
    });
  });

  // ---- Whitelist Current Site ----
  whitelistBtn.addEventListener('click', () => {
    const domain = currentDomainEl.textContent;
    if (!domain || domain === 'N/A' || domain === 'Loading...') return;

    chrome.runtime.sendMessage({ type: 'GET_WHITELIST' }, (response) => {
      const whitelist = response?.whitelist || [];
      if (whitelist.includes(domain)) {
        // Remove from whitelist
        chrome.runtime.sendMessage({ type: 'REMOVE_WHITELIST', domain }, () => {
          whitelistBtn.querySelector('.btn-icon').textContent = '✅';
          whitelistBtn.querySelector('span:last-child').textContent = 'Whitelist';
          statusDot.classList.add('active');
        });
      } else {
        // Add to whitelist
        chrome.runtime.sendMessage({ type: 'ADD_WHITELIST', domain }, () => {
          whitelistBtn.querySelector('.btn-icon').textContent = '❌';
          whitelistBtn.querySelector('span:last-child').textContent = 'Unwhitelist';
          statusDot.classList.remove('active');
        });
      }
    });
  });

  // ---- Check if current site is whitelisted ----
  function checkWhitelistStatus() {
    const domain = currentDomainEl.textContent;
    if (!domain || domain === 'N/A' || domain === 'Loading...') return;

    chrome.runtime.sendMessage({ type: 'GET_WHITELIST' }, (response) => {
      const whitelist = response?.whitelist || [];
      if (whitelist.includes(domain)) {
        whitelistBtn.querySelector('.btn-icon').textContent = '❌';
        whitelistBtn.querySelector('span:last-child').textContent = 'Unwhitelist';
        statusDot.classList.remove('active');
      }
    });
  }

  // ---- Reset Stats ----
  resetBtn.addEventListener('click', () => {
    // Animate numbers to 0
    [totalEl, adsEl, trackersEl, allTimeEl].forEach(el => {
      animateCount(el, 0, 500);
    });
    progressFill.style.width = '0%';
    protectionText.textContent = 'Building';
    protectionText.style.color = '#e74c3c';

    chrome.runtime.sendMessage({ type: 'RESET_STATS' });
  });

  // ---- Auto-refresh stats every 2s ----
  setInterval(loadStats, 2000);

  // ---- Initialize ----
  loadStats();
  loadEnabled();
  setTimeout(checkWhitelistStatus, 500);
});
