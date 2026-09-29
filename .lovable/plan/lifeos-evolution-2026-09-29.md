# LifeOS evolution

## Outcome
Make HabitFlow feel like a practical LifeOS: one calm command center that connects daily habits, planning, reflection, goals, and future life areas without breaking existing workflows.

## Product changes
- Add a LifeOS home view at `/dashboard` with a compact today overview, progress snapshot, quick capture, and clear links into existing modules.
- Reframe the product language from habit-only to life management while keeping HabitFlow branding and the existing black-and-white visual system.
- Add lightweight, usable local-first sections for Tasks, Focus, Projects, Finance, Health, and Learning so the new areas are immediately understandable and interactive without inventing backend data.
- Keep existing habit tracking, calendar, journal/diary, weekly planner, goals, analytics, ideas, social, and offline indicator accessible from the main navigation.
- Update the public landing page to present the full LifeOS scope rather than only habit features.

## Technical details
- Create small React pages/components for the command center and new sections.
- Use existing shadcn components, semantic theme tokens, lucide icons, and the current offline/local storage patterns.
- Add routes and navigation without changing generated backend client files or existing database schemas.
- Store newly introduced demo/workspace entries locally until their persisted backend models are explicitly defined.
- Update app metadata to describe HabitFlow as a LifeOS.
- Verify the central navigation and new views in the running preview, then check build diagnostics.
