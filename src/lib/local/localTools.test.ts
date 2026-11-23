import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { closeLocalDb } from "./localDb";
import { lockLocalVault, unlockLocalVault } from "./vault";
import { localPlannerStore } from "@/lib/data/localPlannerStore";
import { localGoalStore } from "@/lib/data/localGoalStore";
import { localDiaryStore } from "@/lib/data/localDiaryStore";
import { localIdeasStore } from "@/lib/data/localIdeasStore";
import { localScratchPadStore } from "@/lib/data/localScratchPadStore";
import { localBadgeStore } from "@/lib/data/localBadgeStore";
import { localLevelStore } from "@/lib/data/localLevelStore";
import { localShortcutsStore } from "@/lib/data/localShortcutsStore";
import { localSettingsStore } from "@/lib/data/localSettingsStore";
import { exportLocalData, parseBackup, replaceLocalData } from "./backup";

const PASSPHRASE = "HabitFlow local tools test passphrase 123";

beforeEach(async () => {
  await closeLocalDb();
  lockLocalVault();
  globalThis.indexedDB = new IDBFactory();
  await unlockLocalVault(PASSPHRASE);
});

describe("local planner store", () => {
  it("adds, lists, toggles, and deletes weekly plans", async () => {
    const week = "2026-11-23";
    const plan = await localPlannerStore.addPlan(week, "Exercise daily", "high");
    expect(plan.title).toBe("Exercise daily");
    expect(plan.priority).toBe("high");
    expect(plan.is_completed).toBe(false);

    const list = await localPlannerStore.listPlans(week);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(plan.id);

    const toggled = await localPlannerStore.togglePlan(plan.id);
    expect(toggled?.is_completed).toBe(true);

    const otherWeek = await localPlannerStore.listPlans("2026-11-30");
    expect(otherWeek).toHaveLength(0);

    await localPlannerStore.deletePlan(plan.id);
    expect(await localPlannerStore.listPlans(week)).toHaveLength(0);
  });
});

describe("local goal store", () => {
  it("manages goals and nested milestones in the vault", async () => {
    const goal = await localGoalStore.addGoal("Launch MVP", "Finish all tasks", "2026-12-31");
    expect(goal.title).toBe("Launch MVP");
    expect(goal.status).toBe("active");

    const milestone = await localGoalStore.addMilestone(goal.id, "Write unit tests");
    expect(milestone.title).toBe("Write unit tests");
    expect(milestone.is_completed).toBe(false);

    let goals = await localGoalStore.listGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].milestones).toHaveLength(1);

    await localGoalStore.toggleMilestone(milestone.id, false);
    goals = await localGoalStore.listGoals();
    expect(goals[0].milestones[0].is_completed).toBe(true);

    await localGoalStore.updateGoal(goal.id, { status: "completed" });
    goals = await localGoalStore.listGoals();
    expect(goals[0].status).toBe("completed");

    await localGoalStore.deleteMilestone(milestone.id);
    goals = await localGoalStore.listGoals();
    expect(goals[0].milestones).toHaveLength(0);

    await localGoalStore.deleteGoal(goal.id);
    expect(await localGoalStore.listGoals()).toHaveLength(0);
  });
});

describe("local diary store", () => {
  it("creates, updates, tags habits, and deletes diary entries", async () => {
    const entry = await localDiaryStore.createEntry("2026-11-23", "Deep Work Session", { type: "doc" });
    expect(entry.title).toBe("Deep Work Session");

    await localDiaryStore.updateEntry(entry.id, { title: "Updated Deep Work" });
    const entries = await localDiaryStore.listEntries();
    expect(entries[0].title).toBe("Updated Deep Work");

    await localDiaryStore.toggleTag(entry.id, "habit-123");
    let tags = await localDiaryStore.listTags();
    expect(tags).toHaveLength(1);
    expect(tags[0].diary_entry_id).toBe(entry.id);
    expect(tags[0].habit_id).toBe("habit-123");

    // Toggle off
    await localDiaryStore.toggleTag(entry.id, "habit-123");
    tags = await localDiaryStore.listTags();
    expect(tags).toHaveLength(0);

    await localDiaryStore.deleteEntry(entry.id);
    expect(await localDiaryStore.listEntries()).toHaveLength(0);
  });
});

describe("local ideas store", () => {
  it("manages categories and cards", async () => {
    const cat1 = await localIdeasStore.addCategory("Projects");
    const cat2 = await localIdeasStore.addCategory("Life");

    const card = await localIdeasStore.addCard(cat1.id, "Offline First LifeOS");
    expect(card.title).toBe("Offline First LifeOS");

    await localIdeasStore.updateCard(card.id, { content: "Build comprehensive local mode" });
    let { categories, cards } = await localIdeasStore.listData();
    expect(categories).toHaveLength(2);
    expect(cards).toHaveLength(1);
    expect(cards[0].content).toBe("Build comprehensive local mode");

    await localIdeasStore.moveCard(card.id, cat2.id);
    cards = (await localIdeasStore.listData()).cards;
    expect(cards[0].category_id).toBe(cat2.id);

    await localIdeasStore.deleteCard(card.id);
    expect((await localIdeasStore.listData()).cards).toHaveLength(0);

    await localIdeasStore.deleteCategory(cat1.id);
    expect((await localIdeasStore.listData()).categories).toHaveLength(1);
  });
});

describe("local scratch pad store", () => {
  it("saves and loads quick notes", async () => {
    expect(await localScratchPadStore.getNotes()).toBe("");
    await localScratchPadStore.saveNotes("Quick thoughts for today");
    expect(await localScratchPadStore.getNotes()).toBe("Quick thoughts for today");
  });
});

describe("local badges and levels store", () => {
  it("awards badges and tracks XP in vault", async () => {
    const allBadges = await localBadgeStore.listAllBadges();
    expect(allBadges.length).toBeGreaterThan(0);

    const firstBadge = allBadges[0];
    const earnedInitial = await localBadgeStore.listEarnedBadges();
    expect(earnedInitial).toHaveLength(0);

    const awarded = await localBadgeStore.awardBadge(firstBadge.id);
    expect(awarded).toBe(true);

    // Cannot award twice
    const reAwarded = await localBadgeStore.awardBadge(firstBadge.id);
    expect(reAwarded).toBe(false);

    const earned = await localBadgeStore.listEarnedBadges();
    expect(earned).toHaveLength(1);
    expect(earned[0].badge.id).toBe(firstBadge.id);

    expect(await localLevelStore.getTotalXp()).toBe(0);
    const newXp = await localLevelStore.addXp(150);
    expect(newXp).toBe(150);
    expect(await localLevelStore.getTotalXp()).toBe(150);
  });
});

describe("local shortcuts store", () => {
  it("adds, updates, and deletes shortcuts", async () => {
    const shortcut = await localShortcutsStore.addShortcut("Docs", "https://docs.local");
    expect(shortcut.name).toBe("Docs");
    expect(shortcut.url).toBe("https://docs.local");

    await localShortcutsStore.updateShortcut(shortcut.id, "Local Docs", "https://docs.local/v2");
    const list = await localShortcutsStore.listShortcuts();
    expect(list[0].name).toBe("Local Docs");
    expect(list[0].url).toBe("https://docs.local/v2");

    await localShortcutsStore.deleteShortcut(shortcut.id);
    expect(await localShortcutsStore.listShortcuts()).toHaveLength(0);
  });
});

describe("local settings store", () => {
  it("persists username and display name", async () => {
    await localSettingsStore.saveSettings({ username: "zen_coder", display_name: "Zen Master" });
    const settings = await localSettingsStore.getSettings();
    expect(settings.username).toBe("zen_coder");
    expect(settings.display_name).toBe("Zen Master");
  });
});

describe("v3/v4 backup and backwards-compatibility upgrade", () => {
  it("exports and imports full backup containing all migrated tools", async () => {
    await localPlannerStore.addPlan("2026-11-23", "Task A", "high");
    await localGoalStore.addGoal("Goal A");
    await localScratchPadStore.saveNotes("Saved notes");
    await localShortcutsStore.addShortcut("Link", "https://example.com");

    const exported = await exportLocalData();
    expect(exported.schema_version).toBe(4);
    expect(exported.data.weekly_plans).toHaveLength(1);
    expect(exported.data.goals).toHaveLength(1);
    expect(exported.data.scratch_pad.content).toBe("Saved notes");
    expect(exported.data.shortcuts).toHaveLength(1);

    const json = JSON.stringify(exported);
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      await replaceLocalData(parsed.backup);
      expect((await localPlannerStore.listPlans("2026-11-23"))).toHaveLength(1);
    }
  });

  it("upgrades legacy v1 and v2 backups safely to v4 format", () => {
    const v2Backup = {
      app: "habitflow-lifeos",
      schema_version: 2,
      exported_at: "2026-01-01T00:00:00.000Z",
      data: {
        habits: [{ id: "h1", name: "Read", type: "do", is_active: true, notes: null, created_at: "2026-01-01", updated_at: "2026-01-01" }],
        daily_records: [{ id: "r1", habit_id: "h1", record_date: "2026-01-01", completed: true, created_at: "2026-01-01", updated_at: "2026-01-01" }],
        journal_entries: [],
        tasks: [{ id: "t1", title: "Task 1", done: false }],
        projects: [{ id: "p1", title: "Proj 1", area: "Life" }],
      },
    };

    const parsed = parseBackup(JSON.stringify(v2Backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.schema_version).toBe(4);
      expect(parsed.backup.data.habits).toHaveLength(1);
      expect(parsed.backup.data.tasks).toHaveLength(1);
      expect(parsed.backup.data.weekly_plans).toEqual([]);
      expect(parsed.backup.data.goals).toEqual([]);
      expect(parsed.backup.data.shortcuts).toEqual([]);
      expect(parsed.backup.data.notes).toEqual([]);
      expect(parsed.backup.data.finance_transactions).toEqual([]);
    }
  });
});
