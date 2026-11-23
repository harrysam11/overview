# Roadmap

- [x] Evolve HabitFlow into a practical LifeOS experience
- [x] Stage 1: local mode default, docs, .env.example
- [x] Stage 2/3 slice: local store for habits + daily records + journal (+ analytics), backup/restore, hide cloud-only features
- [x] Stage 3b: move planner, goals, diary, ideas, scratch pad, badges/levels to local store; include LifeOS tasks/projects in backup
- [x] Next-stage prompt: bring every remaining tool offline and make the whole app local-first by default, with no cloud runtime dependency
- [x] Local security hardening: encrypt all supported device data and backups with a user passphrase; audit dependencies, offline behavior, and local-only setup
- [x] Decide on cloud data migration: implemented automated one-click Cloud Migration Tool to import legacy cloud data into encrypted local vault
- [x] Address limitations & remaining risks: storage persistence & quota health, passphrase hint & rotation, backup reminders, cross-device incremental sync merge, and offline challenges & quests
- [x] Stage 6: local Ollama integration (offline personal habit coach, model selector, zero-cloud advice)
- [x] GitHub-style 365-day consistency heatmap & day-of-week breakdown (`HabitHeatmap.tsx`)
- [x] Notion/Obsidian-like Markdown Notes Workspace with live preview, frontmatter parsing, `.md` and standalone HTML import/export (`LocalNotes.tsx`)
- [x] Personal Finance & Investment Trackers (income & expense transactions, monthly category budgets, asset portfolio allocation, CSV export/import)
- [x] Inside-Webapp Virtual Filesystem for encrypted attachment & document storage inside IndexedDB (`LocalFiles.tsx`)
- [x] Security hardening: brute-force unlock throttling with exponential backoff penalty, configurable idle auto-lock timers (5m–60m), and storage limits
- [x] Local browser notifications with morning & evening habit check-in triggers
- [x] Full Schema v4 migration with additive upgrade, backup v4 validation, and conflict-free 25-entity sync merge
- [x] Limitations resolved: Dual-engine AI (Ollama + Built-in offline fallback), live storage quota meter with configurable 25 MB limits, and emergency vault recovery kit with passphrase entropy meter
