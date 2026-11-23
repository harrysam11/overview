# Self-hosting HabitFlow LifeOS (local mode)

Local mode is the default. Habits, check-ins, journal, tasks and projects stay on this computer in an encrypted browser vault; no account or cloud requests are needed.

## Run on Zorin OS / Ubuntu (verified commands)

Requires Node.js 20+ (tested with Node 22).

```bash
git clone <your-github-repo-url> habitflow && cd habitflow
npm ci
npm test          # unit tests for the local data layer
npm run build     # outputs dist/
npx vite preview --host 127.0.0.1 --port 4173
```

Open http://127.0.0.1:4173. Keep the app bound to 127.0.0.1 so it is not reachable from your network.
Data is tied to that exact address and browser profile: always use the same URL and browser. Secure browser encryption requires localhost or HTTPS.

For development: `npm run dev` (port 8080).

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

The legacy online mode is not part of the self-hosting setup. Do not add cloud credentials to a local installation. Local mode never loads cloud-only code.

## Remaining cloud dependencies in the codebase (only used in cloud mode)

- `@supabase/supabase-js` client (`src/integrations/supabase/`), used by the original pages and hooks: Dashboard, Social, IdeasBoard, WeeklyPlanner, GoalRoadmap, Diary, Auth, ResetPassword, settings, badges, levels, chat, friends, groups, challenges, shortcuts, scratch pad, offline sync.
- `src/lib/data/cloudHabitStore.ts` (cloud implementation of the habit data contract).
- `supabase/migrations/` and `supabase/functions/rate-limited-action` (server-side, not used locally).
- Hosted email for sign-up/password reset.
