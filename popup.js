// ============================================================
//  Myra AdBlock - Popup Script (Enhanced v2)
//  Animated counters • Stats • Toggle • Whitelist
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  const totalEl      = $('totalBlocked');
  const adsEl        = $('adsBlocked');
  const trackersEl   = $('trackersBlocked');
  const allTimeEl    = $('allTimeBlocked');
  const progressFill = $('progressFill');
  const protection   = $('protectionText');
  const toggle       = $('masterToggle');
  const pickerBtn    = $('elementPickerBtn');
  const whitelistBtn = $('whitelistBtn');
  const resetBtn     = $('resetBtn');
  const domainEl     = $('currentDomain');
  const siteBlockedEl= $('siteBlocked');
  const statusDot    = document.querySelector('.status-dot');

  // ---- Animated Number Counter ----
  function animateTo(el, target, duration = 900) {
    const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
    if (start === target) return;
    const diff = target - start;
    const t0 = performance.now();

    function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = Math.round(start + diff * ease).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
      else {
        el.textContent = target.toLocaleString();
        el.classList.add('counting');
        setTimeout(() => el.classList.remove('counting'), 350);
      }
    }
    requestAnimationFrame(tick);
  }

  // ---- Load Stats ----
  function loadStats() {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, res => {
      if (!res?.stats) return;
      const s = res.stats;

      animateTo(totalEl,    s.todayBlocked || 0);
      animateTo(adsEl,      s.adsBlocked   || 0);
      animateTo(trackersEl, s.trackersBlocked || 0);
      animateTo(allTimeEl,  s.totalBlocked || 0);

      // Progress bar
      const pct = Math.min((s.totalBlocked || 0) / 500 * 100, 100);
      setTimeout(() => { progressFill.style.width = pct + '%'; }, 400);

      // Protection level text
      const t = s.totalBlocked || 0;
      if (t > 1000)      { protection.textContent = 'Maximum';  protection.style.color = '#2ed573'; }
      else if (t > 500)  { protection.textContent = 'High';     protection.style.color = '#1e90ff'; }
      else if (t > 100)  { protection.textContent = 'Medium';   protection.style.color = '#ffa502'; }
      else               { protection.textContent = 'Building'; protection.style.color = '#ff4757'; }
    });
  }

  // ---- Load Toggle State ----
  function loadToggle() {
    chrome.runtime.sendMessage({ type: 'GET_ENABLED' }, res => {
      if (!res) return;
      toggle.checked = res.enabled;
      document.body.classList.toggle('disabled', !res.enabled);
    });
  }

  // ---- Toggle On/Off ----
  toggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED' }, res => {
      if (res) {
        toggle.checked = res.enabled;
        document.body.classList.toggle('disabled', !res.enabled);
      }
    });
  });

  // ---- Get Current Tab ----
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.url) {
      try {
        const u = new URL(tabs[0].url);
        domainEl.textContent = u.hostname;
        checkWhitelist(u.hostname);
      } catch { domainEl.textContent = 'N/A'; }
    }
  });

  // ---- Whitelist ----
  function checkWhitelist(domain) {
    chrome.runtime.sendMessage({ type: 'GET_WHITELIST' }, res => {
      const wl = res?.whitelist || [];
      if (wl.includes(domain)) {
        whitelistBtn.querySelector('.btn-icon').textContent = '❌';
        whitelistBtn.querySelector('span:last-child').textContent = 'Unwhitelist';
        statusDot?.classList.remove('active');
      }
    });
  }

  whitelistBtn.addEventListener('click', () => {
    const domain = domainEl.textContent;
    if (!domain || domain === 'N/A' || domain === '...') return;

    chrome.runtime.sendMessage({ type: 'GET_WHITELIST' }, res => {
      const wl = res?.whitelist || [];
      const type = wl.includes(domain) ? 'REMOVE_WHITELIST' : 'ADD_WHITELIST';
      chrome.runtime.sendMessage({ type, domain }, () => {
        if (type === 'ADD_WHITELIST') {
          whitelistBtn.querySelector('.btn-icon').textContent = '❌';
          whitelistBtn.querySelector('span:last-child').textContent = 'Unwhitelist';
          statusDot?.classList.remove('active');
        } else {
          whitelistBtn.querySelector('.btn-icon').textContent = '⭐';
          whitelistBtn.querySelector('span:last-child').textContent = 'Whitelist';
          statusDot?.classList.add('active');
        }
      });
    });
  });

  // ---- Element Picker ----
  pickerBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_ELEMENT_PICKER' });
        window.close();
      }
    });
  });

  // ---- Reset ----
  resetBtn.addEventListener('click', () => {
    [totalEl, adsEl, trackersEl, allTimeEl].forEach(el => animateTo(el, 0, 500));
    progressFill.style.width = '0%';
    protection.textContent = 'Building';
    protection.style.color = '#ff4757';
    chrome.runtime.sendMessage({ type: 'RESET_STATS' });
  });

  // ---- Auto-refresh ----
  setInterval(loadStats, 2000);

  // ---- Init ----
  loadStats();
  loadToggle();
});
