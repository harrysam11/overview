# Self-hosting HabitFlow LifeOS (local mode)

Local mode is the default. Habits, check-ins, journal, tasks and projects stay in each browser's encrypted vault; no account or cloud requests are needed. The Docker host serves the application but does not hold a central copy of your personal data.

## Private single-owner deployment (Docker)

This deployment has two independent locks:

1. **Server login:** Nginx HTTP Basic Auth, with a SHA-512 password hash stored only in the ignored `secrets/.htpasswd` file.
2. **Personal vault:** the existing browser-side AES-256-GCM vault, unlocked with your own passphrase. The passphrase is never saved or sent to the server.

Use a separate password for each layer. Do not share the server login.

### Requirements

- Docker Engine and the Docker Compose plugin installed by you on the host.
- OpenSSL on the host.
- A stable LAN IP address or local DNS name for the host.
- No router port forwarding.

### Start

```bash
git clone https://github.com/harrysam11/overview.git habitflow
cd habitflow
chmod +x scripts/setup-self-hosted-auth.sh scripts/start-self-hosted.sh
./scripts/setup-self-hosted-auth.sh
./scripts/start-self-hosted.sh
```

The setup script asks you to create a private server username/password and selects your host's LAN IP (you can change it). The start script builds the app and starts Nginx behind Caddy HTTPS. The only published application port is `8443`.

Open the printed URL, for example `https://192.168.0.105:8443`. The first browser visit requires the private Caddy root CA to be trusted on that device:

- The start script exports `secrets/habitflow-root-ca.crt`.
- Transfer that public certificate securely to your own device.
- Install it as a trusted CA certificate in the operating system/browser. On Android, use Settings → Security → Encryption & credentials → Install a certificate → CA certificate (labels vary by device).
- Reopen the HTTPS URL. The browser will first ask for the server username/password, then HabitFlow will ask you to create or unlock your encrypted-vault passphrase.

The CA certificate is public; its private signing key stays in the Docker `caddy_data` volume. Never delete the Docker volumes or `secrets` directory casually. Keep the server login hash private.

To change the server login, rerun `./scripts/setup-self-hosted-auth.sh` and then `docker compose restart habitflow`. To stop the service, run `docker compose down` from the project directory. This does not delete named volumes. Do not use `docker compose down -v` unless you deliberately intend to delete the Caddy CA data.

---

## Run with Node.js (Ubuntu, Linux, macOS, Windows)

Requires Node.js 20+ (tested with Node 22).

```bash
git clone https://github.com/harrysam11/overview.git habitflow && cd habitflow
npm ci
npm test          # 44/44 unit tests for local storage and encryption
npm run build     # outputs production dist/
npx vite preview --host 0.0.0.0 --port 4173
```

- Local-only: `npx vite preview --host 127.0.0.1 --port 4173`
- Development: `npm run dev` (port 8080)

---

## 📱 Mobile Self-Hosting (iOS & Android)

HabitFlow is a fully offline **Progressive Web App (PWA)** that runs smoothly on smartphones and tablets.

### 1. Connecting Your Phone
- **Home Wi-Fi:** Ensure your phone is on the same Wi-Fi network as your host computer. Open the private HTTPS URL printed by the start script (for example, `https://192.168.0.105:8443`). Install/trust the private CA certificate first; plain HTTP over a LAN IP is not a secure browser context for WebCrypto.
- **Remote / Anywhere:** Use a private VPN you control. Do not expose port 8443 to the public internet or configure router port forwarding. Ensure your VPN hostname/IP matches the certificate configured for Caddy.

### 2. Installing as a Native App
- **iOS (iPhone/iPad in Safari):**
  1. Open HabitFlow in Safari.
  2. Tap the **Share** button (box with an arrow pointing up).
  3. Scroll down and tap **"Add to Home Screen"**.
  4. Launch HabitFlow from your home screen — it runs in full-screen standalone mode with zero address bar.
- **Android (Chrome):**
  1. Open HabitFlow in Chrome.
  2. Tap the **three dots menu (⋮)** in the top right.
  3. Tap **"Install app"** or **"Add to Home screen"**.
  4. Launch the standalone app from your app drawer or home screen.

### 3. Syncing Mobile & Desktop (Zero Cloud)
Because data is encrypted inside the device's local browser vault:
- To sync between your phone and computer, go to **Data (`/data`)** on device A and click **Export Encrypted Backup**.
- Send the `.json` file to device B (via AirDrop, LocalSend, or messaging).
- On device B, click **Restore**, select the file, enter your passphrase, and choose **Sync Merge**. All habits, check-ins, notes, and finance records merge cleanly without overwriting either device!

---
## What works locally

| Area | Local mode |
|---|---|
| Habits (do/don't), daily check-ins, edit name/notes | Yes (IndexedDB) |
| Daily journal, calendar, points, streaks | Yes |
| Analytics charts, habit-wise analysis | Yes |
| 365-day GitHub-style consistency heatmaps & day-of-week grid | Yes (`HabitHeatmap.tsx`) |
| Local AI Habit Coach (Ollama `http://127.0.0.1:11434`) | Yes (`OllamaHabitCoach.tsx`, offline LLM) |
| Notion / Obsidian Markdown Vault (view/edit, live preview, YAML frontmatter, `.md`/HTML export & import) | Yes (`/notes`, `LocalNotes.tsx`) |
| Expense & Investment Trackers (income/expenses, monthly category budgets, portfolio asset allocation, CSV export/import) | Yes (`/finance`, `LocalFinance.tsx`) |
| Inside-Webapp Virtual Filesystem (AES-GCM encrypted document & attachment storage) | Yes (`/files`, `LocalFiles.tsx`) |
| Browser Habit Reminders (scheduled morning & evening notifications) | Yes (`SettingsDialog.tsx`, `notifications.ts`) |
| LifeOS home: tasks, projects | Yes (encrypted browser vault) |
| Weekly Planner | Yes (encrypted browser vault) |
| Goals & Milestones Roadmap | Yes (encrypted browser vault) |
| Universal Diary & Habit Tagging | Yes (encrypted browser vault) |
| Ideas Board & Categories | Yes (encrypted browser vault) |
| Scratch Pad notes | Yes (encrypted browser vault) |
| Badges & XP / Level Progression | Yes (encrypted browser vault) |
| App Shortcuts & Settings | Yes (encrypted browser vault) |
| Challenges & Solo Quests | Yes (encrypted browser vault) |
| Backup & Sync Merge (cross-device sync across 25 entities) | Yes, `/data` page, passphrase-encrypted JSON, max 10 MB |
| Legacy Cloud Account Migration | Yes, one-click migration assistant in `/data` |
| Friends, live chat, multi-user groups | Off by design (multi-user network tracking) |
| Accounts / sign in | Not used locally |

## Storage, sync & security features

- **Single-owner server access:** the self-hosted Docker stack requires the private Nginx login before serving the app. It is not an open public signup service.
- **HTTPS:** Caddy terminates HTTPS using a private local CA. Trust its root certificate on your own devices before using the vault/PWA. The CA private key persists in the `caddy_data` Docker volume.
- **Two separate credentials:** server access password protects the hosted website; the vault passphrase decrypts the data stored by that browser. These are not the same login system.

- **Storage Eviction & Health:** The app monitors `navigator.storage.persisted()` and available quota. You can request persistent storage directly in `/data`. Proactive backup reminders appear if you have not exported in over a week.
- **Emergency Vault Recovery Kit:** Download or print a standalone Emergency Vault Recovery Sheet (`.html`) in `/data` or Settings. It records your vault metadata, passphrase hint, instructions, and physical recovery backup.
- **Passphrase Entropy & Strength Meter:** Visual real-time strength meter (Too Short / Weak / Fair / Strong / Very Strong) with actionable feedback when setting up your vault.
- **Dual-Engine Local AI (Ollama + Built-in Fallback):** The AI Habit Coach works seamlessly even with zero external software installed via the built-in local cognitive engine, while seamlessly connecting to Ollama (`llama3`, `mistral`, `phi3`) when the daemon is running.
- **Storage Quota Meter & Configurable File Limits:** Live storage consumption meter queries `navigator.storage.estimate()` to prevent quota exhaustion, with user-selectable upload limits up to 25 MB per file.
- **Brute-Force Attack Throttling:** Failed passphrase unlock attempts trigger exponential backoff delays (2s, 4s, 8s up to 60s), preventing automated brute-force attacks on your device.
- **Configurable Idle Lock:** Customize your vault auto-lock timer (5, 10, 15, 30, or 60 minutes) to balance security and convenience.
- **Cross-Device Sync Merge:** Syncing between devices (laptop, desktop, phone) is achieved via **Sync Merge** in `/data`. When importing an encrypted backup from another device, choosing "Sync Merge" combines records across all 25 entities without erasing either device's progress.
- **Cloud Account Migration:** Users with existing cloud data in Supabase can click "Import from Cloud Account" on the `/data` page to pull their cloud habits, check-ins, tasks, and notes directly into their local encrypted vault.
- **Offline Challenges & Quests:** Create custom challenges (points, streaks, habit completions) and track progress completely offline on the `/social` page.

## Known boundaries

- Clearing browser profile data deletes IndexedDB storage. Safeguard your progress by generating an Emergency Recovery Kit and regular backups in `/data`.
- Zero-knowledge encryption: Passphrases are never saved or transmitted. Use your Emergency Recovery Kit and Passphrase Hint to prevent lockouts.
- Multi-user live chat and remote peer requests require external network connections and are disabled in local mode to maintain zero-telemetry offline privacy.
- The offline app-install (PWA) caches static app files only; private local data stays inside your browser's encrypted vault.

## Cloud mode (opt-in, legacy)

The legacy online mode is not part of the private self-hosting setup. Do not add cloud credentials to a local installation. Keep `VITE_DATA_MODE=local`; local mode never loads cloud-only code.

## Remaining cloud dependencies in the codebase (only used in cloud mode)

- `@supabase/supabase-js` client (`src/integrations/supabase/`), used by the original pages and hooks: Dashboard, Social, IdeasBoard, WeeklyPlanner, GoalRoadmap, Diary, Auth, ResetPassword, settings, badges, levels, chat, friends, groups, challenges, shortcuts, scratch pad, offline sync.
- `src/lib/data/cloudHabitStore.ts` (cloud implementation of the habit data contract).
- `supabase/migrations/` and `supabase/functions/rate-limited-action` (server-side, not used locally).
- Hosted email for sign-up/password reset.
