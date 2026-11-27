# HabitFlow LifeOS 🌿

> **A private, local-first, self-hostable personal operating system & habit tracker.**  
> Keep all your habits, notes, finances, tasks, files, and personal growth on your own device with zero cloud dependencies and client-side AES-GCM encryption.

---

## ✨ Features

- 📅 **Habit Tracking & Consistency Heatmaps**
  - Positive ("Do") and negative ("Don't") habits with streak calculations.
  - GitHub-style 365-day consistency contribution graph & day-of-week breakdown.
  - Gamified XP, levels, and milestone badges.

- 📝 **Markdown Notes Workspace (Obsidian / Notion-like)**
  - Live preview markdown editor with frontmatter metadata.
  - Organization tags, pinning, and full-text search.
  - Import & export notes seamlessly as `.md` or standalone HTML.

- 💰 **Personal Finance & Investment Trackers**
  - Income and expense transaction ledger with category breakdowns.
  - Monthly budget tracking with progress indicators.
  - Asset portfolio allocation tracker and CSV import/export.

- 📁 **Inside-Webapp Virtual Filesystem**
  - Encrypted file attachments and documents stored securely inside IndexedDB.
  - Filter by file category (Documents, Images, Archives, Data).
  - Client-side download and preview.

- 🎯 **LifeOS Productivity Suite**
  - Daily planner & Eisenhower matrix task management.
  - Multi-tier goals & milestones.
  - Private journal, reflective diary, idea cards, and scratchpad.

- 🧠 **Dual-Engine Private AI Coach**
  - **Built-in Offline Engine:** Works instantly out-of-the-box with zero external software.
  - **Optional Ollama Integration:** Connect to your local [Ollama](https://ollama.com/) instance (`http://127.0.0.1:11434`) for private LLM reflections.

- 🔒 **Security & Privacy Hardening**
  - Passphrase-derived **AES-GCM 256-bit** encrypted vault for all local data.
  - Non-extractable encryption keys kept only in memory.
  - Exponential brute-force backoff protection against rapid unlock attempts.
  - Configurable idle auto-lock timers (5 to 60 minutes).
  - Emergency Vault Recovery Kit (`.html`) generator.
  - Zero external network requests (no third-party analytics, fonts, or telemetry).

- 📱 **Mobile & PWA Ready**
  - Standalone Progressive Web App (PWA) with offline asset caching.
  - Installable directly on iOS Safari and Android Chrome.

- 🔄 **Cross-Device Sync Merge**
  - Conflict-free JSON sync merge across 25 local entities.
  - Sync between your desktop and mobile phone securely without an intermediary server.

---

## 🚀 Quick Start

### Option 1: Docker (Recommended for Self-Hosting)

The fastest way to deploy HabitFlow LifeOS locally or on your home server:

```bash
# Clone the repository
git clone https://github.com/harrysam11/overview.git
cd overview

# Create your private server login and configure the HTTPS hostname/IP
chmod +x scripts/setup-self-hosted-auth.sh scripts/start-self-hosted.sh
./scripts/setup-self-hosted-auth.sh

# Build and start the private HTTPS instance
./scripts/start-self-hosted.sh
```

Open the HTTPS URL printed by the script (for example, `https://192.168.0.105:8443`). Trust the generated private CA certificate on your own devices first. The server login protects the website; the separate vault passphrase decrypts your browser's personal data. See [SELF_HOSTING.md](SELF_HOSTING.md) for Android certificate installation and remote-access safety.

---

### Option 2: Local Development (Node.js)

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Clone repository
git clone https://github.com/harrysam11/overview.git
cd overview

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit **`http://127.0.0.1:8080`** to access the application.

To create an optimized production build:
```bash
npm run build
npm run preview
```

---

## 📱 Mobile Installation (PWA)

HabitFlow LifeOS is designed to look and feel like a native mobile app:

1. Open your self-hosted URL (e.g., `http://192.168.1.50:8080` or Tailscale IP) on your phone.
2. **iOS (Safari):** Tap the **Share** button $\rightarrow$ Select **"Add to Home Screen"**.
3. **Android (Chrome):** Tap the **Menu (⋮)** $\rightarrow$ Select **"Install App"** or **"Add to Home screen"**.
4. Launch HabitFlow directly from your home screen. It will open in full-screen standalone mode and function 100% offline.

For detailed self-hosting, reverse proxy (Nginx, Caddy), and LAN/Tailscale instructions, see [SELF_HOSTING.md](SELF_HOSTING.md).

---

## 🧪 Testing & Verification

HabitFlow includes comprehensive Vitest unit tests covering local store operations, crypto encryption/decryption, sync merge conflict resolution, and offline tools:

```bash
# Run test suite
npm test
```

---

## 📜 Architecture & Technology Stack

- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI / shadcn
- **Storage:** Client-side IndexedDB (`idb`) with WebCrypto API (AES-GCM / PBKDF2)
- **Editor:** TipTap rich-text & Markdown workspace
- **Charts:** Recharts (Habit heatmaps, financial breakdowns, streak analytics)
- **Deployment:** Nginx Alpine Docker container & Vite PWA Service Worker

---

## 🛡️ License

This project is open source and available under the [MIT License](LICENSE).
