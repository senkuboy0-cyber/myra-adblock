# 🛡️ Myra AdBlock

A powerful Chrome ad blocker extension built with Manifest V3 — blocks ads, trackers, and annoyances with live stats and a beautiful dark UI.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![Chrome](https://img.shields.io/badge/Chrome-Extension-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- **🚫 Network-level Blocking** — 50+ ad domains + 20 tracker domains blocked via `declarativeNetRequest`
- **🎨 Cosmetic Filtering** — 60+ CSS selectors hide ad elements that still load in the DOM
- **▶️ YouTube Ad Skip** — Auto-skips video ads, removes ad overlays, speeds through ad playback
- **🕵️ Anti-Adblock Bypass** — Detects and removes "disable your adblocker" walls
- **🎯 Element Picker** — Click any element on a page to manually block it
- **📊 Live Stats Dashboard** — See Ads blocked, Trackers blocked, Today's count, All-time total
- **🔔 Animated Badge** — Extension icon shows real-time blocked count
- **✅ Site Whitelist** — Whitelist specific domains with one click
- **🌙 Beautiful Dark UI** — Modern dark theme with smooth animations and transitions
- **🔄 MutationObserver** — Catches dynamically loaded ads in real-time

---

## 📦 Installation (Developer Mode)

1. **Download** or clone this repository:
   ```bash
   git clone https://github.com/senkuboy0-cyber/myra-adblock.git
   ```

2. Open Chrome and go to: `chrome://extensions`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked**

5. Select the `myra-adblock` folder

6. The 🛡️ icon will appear in your toolbar — done!

---

## 🧪 How It Works

```
┌─────────────────────────────────────────────┐
│           Request from Website              │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  declarativeNetRequest (Network Level)       │
│  • rules.json        → 50 ad domains         │
│  • tracker_rules.json → 20 tracker domains   │
│  Blocks the request BEFORE it loads          │
└──────────────┬───────────────────────────────┘
               │ (if request gets through)
               ▼
┌──────────────────────────────────────────────┐
│  Content Script (Cosmetic Level)             │
│  • content.js + content.css                  │
│  • Hides ad elements with CSS                │
│  • MutationObserver catches dynamic ads      │
│  • YouTube-specific ad skip logic            │
│  • Anti-adblock wall removal                 │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Background Service Worker                   │
│  • Tracks blocked count (ads vs trackers)    │
│  • Updates badge with live count             │
│  • Manages whitelist and settings            │
└──────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
myra-adblock/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker - stats tracking
├── content.js             # Content script - cosmetic filtering
├── content.css            # CSS for ad hiding
├── popup.html             # Popup UI
├── popup.css              # Popup styles (dark theme)
├── popup.js               # Popup logic (animated stats)
├── rules.json             # Network blocking rules (ads)
├── tracker_rules.json     # Network blocking rules (trackers)
├── icons/
│   └── icon.svg           # Extension icon
└── README.md              # This file
```

---

## 🎨 Popup Features

- **Live counter** with animated number counting
- **Rotating conic gradient** hero section
- **Pulsing shield** logo animation
- **Shimmer progress bar** showing protection level
- **Hover effects** on all stat cards
- **Toggle switch** with spring animation
- **Green status dot** with pulsing glow
- **Per-site domain** info and whitelist toggle

---

## ⚡ Blocked Categories

### Ad Networks (50 rules)
Google Ads, DoubleClick, Amazon Ads, Yahoo Ads, Taboola, Outbrain, Criteo, PopAds, AdColony, PubMatic, OpenX, Rubicon, and more...

### Trackers (20 rules)
Facebook Pixel, Google Analytics, Hotjar, Microsoft Clarity, Mixpanel, Segment, Amplitude, FullStory, LinkedIn, Bing, Twitter...

### Cosmetic Filters (60+ selectors)
Generic ad containers, Google Ads, Ad iframes, Social media ads, YouTube ads, Pop-ups, Cookie banners, Affiliate content...

---

## ⚠️ Manifest V3 Limitations

Chrome MV3 imposes some limits on ad blockers:

| Limit | Value |
|-------|-------|
| Static rules | 330,000 max |
| Dynamic rules | 30,000 max |
| No webRequest blocking | Replaced by declarativeNetRequest |
| No real-time rule updates | Rules must be pre-declared |

This extension works around these limits by combining network-level blocking with cosmetic CSS filtering and DOM manipulation.

---

## 🛣️ Roadmap

- [ ] Auto-update EasyList / uBlock filter lists
- [ ] Per-site stats dashboard
- [ ] Custom rule editor (add your own filter rules)
- [ ] Import/export settings
- [ ] Popup counter showing per-domain blocks
- [ ] Firefox support (Manifest V2 compatible)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🫶 Credits

Built with ❤️ by **Myra AdBlock**
