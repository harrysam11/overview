# Remix of Habitflow

🔥 Prompt Title: Responsive Habit Tracker (Calendar Version) — No Data Loss 🔒

Context:
Build a full-stack Flask web app (with SQLite) for daily habit tracking using a visual calendar.
App should be responsive, mobile-friendly, and store all user data persistently without data loss.

⚙️ Core Features:
1. Home Page (Calendar View)
   - Monthly calendar view using JS or FullCalendar.
   - Each day is color-coded:
     🟢 Green = All Do’s done & No Don’ts
     🔴 Red = Any Don’t done or missed task
     ⚪ Gray = No data or rest day
   - Click on a date → Opens summary (tasks + journal + points).

2. Task Page (Daily Do’s & Don’ts)
   - Add/edit/delete your Do’s (positive habits) and Don’ts (bad habits).
   - Toggle completion for each task daily.
   - Auto-sync with calendar and points system.

3. Journal Page (Daily Reflection)
   - Write daily thoughts or reflections.
   - Each journal entry gives +2 points.
   - Editable + autosave system (no data loss).

4. Analytics Page (Progress Stats)
   - Weekly/monthly bar chart (Do’s vs Don’ts vs Journal entries).
   - Total points, streaks, and average performance %.
   - Motivational quote or progress summary.

5. Points System 🏆
   - +4 points per Do’s completed.
   - +4 points for avoiding Don’ts.
   - +2 points for journal entry.
   - Auto-calculated daily & shown in calendar color.

6. Data Safety & Persistence
   - SQLite local DB (auto create tables if missing).
   - Flask-Migrate for schema updates.
   - Auto backup/restore system to avoid loss on reload or crash.

7. Responsive Design
   - Use Bootstrap 5 or Tailwind CSS.
   - Light/Dark mode toggle.
   - Works on mobile & desktop smoothly.

8. Bonus (Optional Future Features)
   - User authentication (login/signup).
   - Cloud backup (Google Drive / Firebase sync).
   - Notification/reminder system.
   - Export reports to CSV/PDF.
   - “Streak Reminder” Telegram/Email integration.

🗃️ Tech Stack:
- Backend: Flask + SQLite
- Frontend: HTML + Tailwind/Bootstrap + JS Calendar (FullCalendar or Vanilla JS)
- ORM: SQLAlchemy
- Session: Flask-Login / Secure cookies
- Charts: Chart.js
- Optional: Flask-Migrate (for updates)

🧩 Database Tables:
users(id, username, password, created_at)
tasks(id, user_id, name, type("do"/"dont"))
daily_records(id, user_id, date, completed_dos, avoided_donts, journal_text, points)
analytics_cache(id, user_id, week, month, total_points, avg_score)

🔑 API Keys Required?
❌ Not mandatory — Works offline using SQLite.
✅ Optional if you add:
   - Google OAuth (login/backup)
   - Telegram Bot (reminders)
   - Cloud storage (Firebase, Supabase, or Google Drive API)

💡 Final Output Expectation:
A beautiful, minimal, responsive Flask + SQLite Habit Tracker with:
- No data loss
- Calendar dashboard
- Points-based analytics
- Journal + Do’s/Don’ts task manager
- Mobile responsive UI

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4ad3e1ee-043d-4c19-a7f9-2e3e53b3586c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
