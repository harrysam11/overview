import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  unlockLocalVault,
  lockLocalVault,
  getPassphraseHint,
  setPassphraseHint,
  changePassphrase,
  readVaultData,
  updateVaultData,
  getLastBackupTime,
  recordBackupTime,
  exportEncryptedBackup,
  decryptBackupWithPassphrase,
} from "./vault";
import { closeLocalDb, newId, nowIso } from "./localDb";
import { mergeLocalData, exportLocalData, backupCounts } from "./backup";
import { localChallengeStore } from "@/lib/data/localChallengeStore";
import { BACKUP_APP_ID, BACKUP_SCHEMA_VERSION, type LocalBackup } from "./schema";

describe("Limitations & Remaining Risks Solutions", () => {
  const TEST_PASS = "correct-horse-battery-staple-passphrase";
  const NEW_PASS = "brand-new-secure-passphrase-2026-v3";

  beforeEach(async () => {
    lockLocalVault();
    await closeLocalDb();
    indexedDB = new (await import("fake-indexeddb")).IDBFactory();
  });

  describe("Passphrase Safety & Hint Management", () => {
    it("saves and retrieves a passphrase hint", async () => {
      await unlockLocalVault(TEST_PASS, "My favorite childhood horse");
      expect(await getPassphraseHint()).toBe("My favorite childhood horse");

      await setPassphraseHint("Updated hint: book title");
      expect(await getPassphraseHint()).toBe("Updated hint: book title");
    });

    it("re-encrypts vault with changePassphrase and unlocks with new passphrase", async () => {
      await unlockLocalVault(TEST_PASS, "Initial hint");

      // Populate some habit data
      await updateVaultData((d) => ({
        ...d,
        habits: [
          {
            id: "h1",
            name: "Meditation",
            type: "do",
            is_active: true,
            notes: "Morning routine",
            created_at: nowIso(),
            updated_at: nowIso(),
          },
        ],
      }));

      // Change passphrase
      await changePassphrase(NEW_PASS, "New passphrase hint");

      // Verify hint updated
      expect(await getPassphraseHint()).toBe("New passphrase hint");

      // Verify active data is still accessible
      const data = await readVaultData();
      expect(data.habits).toHaveLength(1);
      expect(data.habits[0].name).toBe("Meditation");

      // Lock vault
      lockLocalVault();

      // Old passphrase must fail
      await expect(unlockLocalVault(TEST_PASS)).rejects.toThrow();

      // New passphrase must succeed
      await unlockLocalVault(NEW_PASS);
      const reloadedData = await readVaultData();
      expect(reloadedData.habits).toHaveLength(1);
      expect(reloadedData.habits[0].name).toBe("Meditation");
    });

    it("records and tracks last backup timestamp", async () => {
      await unlockLocalVault(TEST_PASS);
      expect(await getLastBackupTime()).toBeNull();

      await recordBackupTime();
      const recorded = await getLastBackupTime();
      expect(recorded).not.toBeNull();
      expect(typeof recorded).toBe("string");
    });
  });

  describe("Cross-Device Sync (Incremental Merge)", () => {
    it("merges data from two different devices without data loss", async () => {
      await unlockLocalVault(TEST_PASS);

      // Device A has Habit 1 and checked in on Day 1
      await updateVaultData((d) => ({
        ...d,
        habits: [
          {
            id: "habit-1",
            name: "Morning Run",
            type: "do",
            is_active: true,
            notes: null,
            created_at: "2026-11-01T08:00:00Z",
            updated_at: "2026-11-01T08:00:00Z",
          },
        ],
        daily_records: [
          {
            id: "rec-1",
            habit_id: "habit-1",
            record_date: "2026-11-01",
            completed: true,
            created_at: "2026-11-01T08:00:00Z",
            updated_at: "2026-11-01T08:00:00Z",
          },
        ],
        tasks: [{ id: "task-1", title: "Read book", done: false }],
        user_level: { total_xp: 50, updated_at: "2026-11-01T08:00:00Z" },
      }));

      // Device B backup has Habit 2, checks for Habit 1 on Day 2, and higher XP
      const deviceBBackup: LocalBackup = {
        app: BACKUP_APP_ID,
        schema_version: BACKUP_SCHEMA_VERSION,
        exported_at: "2026-11-02T10:00:00Z",
        data: {
          habits: [
            {
              id: "habit-1",
              name: "Morning Run",
              type: "do",
              is_active: true,
              notes: "Updated note from phone",
              created_at: "2026-11-01T08:00:00Z",
              updated_at: "2026-11-02T09:00:00Z",
            },
            {
              id: "habit-2",
              name: "Evening Stretching",
              type: "do",
              is_active: true,
              notes: null,
              created_at: "2026-11-02T09:00:00Z",
              updated_at: "2026-11-02T09:00:00Z",
            },
          ],
          daily_records: [
            {
              id: "rec-2",
              habit_id: "habit-1",
              record_date: "2026-11-02",
              completed: true,
              created_at: "2026-11-02T09:00:00Z",
              updated_at: "2026-11-02T09:00:00Z",
            },
          ],
          journal_entries: [
            {
              id: "j-1",
              entry_date: "2026-11-02",
              content: "Had a great run and stretched",
              created_at: "2026-11-02T09:00:00Z",
              updated_at: "2026-11-02T09:00:00Z",
            },
          ],
          tasks: [
            { id: "task-1", title: "Read book", done: true }, // marked done on phone
            { id: "task-2", title: "Drink water", done: false },
          ],
          projects: [{ id: "proj-1", title: "Fitness Goal", area: "health" }],
          weekly_plans: [],
          goals: [],
          milestones: [],
          diary_entries: [],
          diary_entry_habits: [],
          idea_categories: [],
          idea_cards: [],
          scratch_pad: { content: "Scratch note from phone", updated_at: "2026-11-02T09:00:00Z" },
          user_badges: [{ id: "ub-1", badge_id: "badge_first_habit", earned_at: "2026-11-01T08:00:00Z" }],
          user_level: { total_xp: 120, updated_at: "2026-11-02T09:00:00Z" },
          settings: { username: "sam", display_name: "Sam", updated_at: "2026-11-02T09:00:00Z" },
          shortcuts: [],
          challenges: [],
          challenge_participants: [],
        },
      };

      // Perform sync merge
      const result = await mergeLocalData(deviceBBackup);
      const counts = backupCounts(result);

      // Verify merged totals
      expect(counts.habits).toBe(2); // Habit 1 and Habit 2 both present
      expect(counts.records).toBe(2); // Check-ins from Day 1 and Day 2 both present
      expect(counts.journal).toBe(1);
      expect(counts.tasks).toBe(2);
      expect(counts.projects).toBe(1);

      // Verify merged data in vault
      const vaultData = await readVaultData();
      expect(vaultData.habits.find((h) => h.id === "habit-1")?.notes).toBe("Updated note from phone");
      expect(vaultData.tasks.find((t) => t.id === "task-1")?.done).toBe(true);
      expect(vaultData.user_level?.total_xp).toBe(120);
      expect(vaultData.scratch_pad?.content).toBe("Scratch note from phone");
    });
  });

  describe("Local Challenges & Offline Social Quests", () => {
    it("creates a local challenge, calculates real-time progress from habits, and lists participants", async () => {
      await unlockLocalVault(TEST_PASS);

      // Add a habit and 3 check-ins
      await updateVaultData((d) => ({
        ...d,
        habits: [
          {
            id: "h1",
            name: "Morning Run",
            type: "do",
            is_active: true,
            notes: null,
            created_at: "2026-11-01T08:00:00Z",
            updated_at: "2026-11-01T08:00:00Z",
          },
        ],
        daily_records: [
          { id: "r1", habit_id: "h1", record_date: "2026-11-01", completed: true, created_at: "2026-11-01T08:00:00Z", updated_at: "2026-11-01T08:00:00Z" },
          { id: "r2", habit_id: "h1", record_date: "2026-11-02", completed: true, created_at: "2026-11-02T08:00:00Z", updated_at: "2026-11-02T08:00:00Z" },
          { id: "r3", habit_id: "h1", record_date: "2026-11-03", completed: true, created_at: "2026-11-03T08:00:00Z", updated_at: "2026-11-03T08:00:00Z" },
        ],
      }));

      // Create challenge
      const challenge = await localChallengeStore.createChallenge({
        name: "Run Every Day",
        start_date: "2026-11-01T00:00:00Z",
        end_date: "2026-11-07T23:59:59Z",
        goal_type: "habits_completed",
        goal_value: 5,
      });

      expect(challenge.name).toBe("Run Every Day");

      // List participants and verify calculated progress
      const participants = await localChallengeStore.listParticipants(challenge.id);
      expect(participants).toHaveLength(1);
      expect(participants[0].user_id).toBe("local-user");
      expect(participants[0].progress).toBe(3); // 3 check-ins within interval

      // Delete challenge
      await localChallengeStore.deleteChallenge(challenge.id);
      const remaining = await localChallengeStore.listChallenges();
      expect(remaining).toHaveLength(0);
    });
  });
});
