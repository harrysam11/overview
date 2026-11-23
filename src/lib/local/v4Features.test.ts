import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { lockLocalVault, unlockLocalVault, readVaultData, updateVaultData } from "./vault";
import { localNotesStore } from "../data/localNotesStore";
import { localFinanceStore } from "../data/localFinanceStore";
import { localFileSystemStore } from "../data/localFileSystemStore";
import { exportLocalData, parseBackup, replaceLocalData, mergeLocalData } from "./backup";
import { getAiSettings, updateAiSettings } from "../ai/ollamaClient";
import { getNotificationSettings, updateNotificationSettings, checkAndTriggerHabitReminders } from "./notifications";

const PASSPHRASE = "v4-features-super-secure-passphrase";

describe("v4 offline and local-first features", () => {
  beforeEach(async () => {
    lockLocalVault();
    await unlockLocalVault(PASSPHRASE);
    await updateVaultData((d) => ({
      ...d,
      notes: [],
      finance_transactions: [],
      finance_budgets: [],
      investment_assets: [],
      stored_files: [],
    }));
  });

  describe("Notes Workspace (Notion/Obsidian style)", () => {
    it("creates, updates, pins, and deletes markdown notes", async () => {
      const note = await localNotesStore.createNote({
        title: "Architecture Design",
        content: "# System Architecture\n- Local-first IndexedDB\n- AES-GCM 256 encryption",
        folder: "Tech",
        tags: ["architecture", "crypto"],
        is_pinned: true,
      });

      expect(note.id).toBeTruthy();
      expect(note.title).toBe("Architecture Design");
      expect(note.is_pinned).toBe(true);
      expect(note.tags).toEqual(["architecture", "crypto"]);

      const fetched = await localNotesStore.getNote(note.id);
      expect(fetched?.folder).toBe("Tech");

      // Update content
      await localNotesStore.updateNote(note.id, {
        title: "Architecture Design v2",
        content: "# Updated System Architecture",
      });

      const updated = await localNotesStore.getNote(note.id);
      expect(updated?.title).toBe("Architecture Design v2");
      expect(updated?.content).toBe("# Updated System Architecture");

      // List notes
      const notesList = await localNotesStore.listNotes();
      expect(notesList).toHaveLength(1);

      // Delete note
      await localNotesStore.deleteNote(note.id);
      const afterDelete = await localNotesStore.listNotes();
      expect(afterDelete).toHaveLength(0);
    });

    it("parses and generates markdown with YAML frontmatter", async () => {
      const mdWithFrontmatter = `---
title: "My Imported Note"
folder: "Journal"
---
# Today's Reflection
Everything is running offline and locally!`;

      const imported = await localNotesStore.importMarkdownNote("My Imported Note.md", mdWithFrontmatter);
      expect(imported.title).toBe("My Imported Note");
      expect(imported.folder).toBe("Journal");
      expect(imported.content).toContain("Today's Reflection");

      const exportedMd = localNotesStore.exportNoteToMarkdown(imported);
      expect(exportedMd).toContain('title: "My Imported Note"');
      expect(exportedMd).toContain('folder: "Journal"');
      expect(exportedMd).toContain("Everything is running offline and locally!");

      const exportedHtml = localNotesStore.exportNoteToHtml(imported);
      expect(exportedHtml).toContain("<!DOCTYPE html>");
      expect(exportedHtml).toContain("My Imported Note");
    });
  });

  describe("Expense and Investment Trackers", () => {
    it("manages finance transactions and computes summaries", async () => {
      await localFinanceStore.createTransaction({
        type: "income",
        category: "Salary",
        amount: 5000,
        date: "2026-11-01",
        description: "Monthly salary",
      });

      await localFinanceStore.createTransaction({
        type: "expense",
        category: "Groceries",
        amount: 250,
        date: "2026-11-02",
        description: "Supermarket run",
      });

      await localFinanceStore.createTransaction({
        type: "expense",
        category: "Utilities",
        amount: 150,
        date: "2026-11-05",
        description: "Internet and power",
      });

      const transactions = await localFinanceStore.listTransactions();
      expect(transactions).toHaveLength(3);

      const summary = await localFinanceStore.getSummary("2026-11");
      expect(summary.totalIncome).toBe(5000);
      expect(summary.totalExpenses).toBe(400);
      expect(summary.netSavings).toBe(4600);
      expect(summary.savingsRate).toBeCloseTo(92, 0);
    });

    it("tracks category budgets and lists limits", async () => {
      await localFinanceStore.setBudget("Groceries", 200);
      await localFinanceStore.setBudget("Dining", 300);

      const budgets = await localFinanceStore.listBudgets();
      expect(budgets).toHaveLength(2);
      const groceriesBudget = budgets.find((b) => b.category === "Groceries");
      expect(groceriesBudget).toBeDefined();
      expect(groceriesBudget?.monthly_limit).toBe(200);
    });

    it("tracks investment assets and portfolio allocation gains", async () => {
      await localFinanceStore.createAsset({
        name: "Index Fund ETF",
        symbol: "VOO",
        asset_class: "etf",
        units: 10,
        buy_price: 100,
        current_price: 125,
      });

      await localFinanceStore.createAsset({
        name: "Bitcoin",
        symbol: "BTC",
        asset_class: "crypto",
        units: 0.5,
        buy_price: 40000,
        current_price: 60000,
      });

      const summary = await localFinanceStore.getSummary();
      // ETF: cost = 1000, value = 1250, gain = 250
      // Crypto: cost = 20000, value = 30000, gain = 10000
      expect(summary.totalInvested).toBe(21000);
      expect(summary.totalPortfolioValue).toBe(31250);
      expect(summary.totalGainLoss).toBe(10250);
    });

    it("exports transactions to CSV and imports CSV records", async () => {
      await localFinanceStore.createTransaction({
        type: "expense",
        category: "Hardware",
        amount: 80,
        date: "2026-11-20",
        description: "USB Drive",
      });

      const csv = await localFinanceStore.exportTransactionsCsv();
      expect(csv).toContain("id,date,type,category,amount,description");
      expect(csv).toContain('2026-11-20,expense,"Hardware",80.00,"USB Drive"');

      const newCsv = `id,date,type,category,amount,description
id-1,2026-11-21,income,"Freelance",1200.00,"Project delivery"
id-2,2026-11-22,expense,"Books",45.00,"Offline reading"`;

      const importedCount = await localFinanceStore.importTransactionsCsv(newCsv);
      expect(importedCount).toBe(2);

      const all = await localFinanceStore.listTransactions();
      expect(all).toHaveLength(3);
    });
  });

  describe("Inside-Webapp Filesystem Store", () => {
    it("stores encrypted files in the vault and retrieves them", async () => {
      const dummyBase64 = "SGVsbG8gV29ybGQ="; // "Hello World"
      const file = await localFileSystemStore.saveFile({
        name: "readme.txt",
        type: "text/plain",
        size: 11,
        dataBase64: dummyBase64,
      });

      expect(file.id).toBeTruthy();
      expect(file.name).toBe("readme.txt");
      expect(file.size).toBe(11);

      const files = await localFileSystemStore.listFiles();
      expect(files).toHaveLength(1);

      const retrieved = await localFileSystemStore.getFile(file.id);
      expect(retrieved?.data_base64).toBe(dummyBase64);

      await localFileSystemStore.deleteFile(file.id);
      expect(await localFileSystemStore.listFiles()).toHaveLength(0);
    });
  });

  describe("Local Ollama AI & Notification Settings", () => {
    it("persists local Ollama configuration without external calls", async () => {
      const initial = await getAiSettings();
      expect(initial.endpoint).toBe("http://127.0.0.1:11434");
      expect(initial.model).toBe("llama3");

      await updateAiSettings({
        model: "mistral",
        system_prompt: "You are a concise offline habit advisor.",
      });

      const updated = await getAiSettings();
      expect(updated.model).toBe("mistral");
      expect(updated.system_prompt).toBe("You are a concise offline habit advisor.");
    });

    it("manages notification reminder preferences and safe trigger checks", async () => {
      const notifSettings = await getNotificationSettings();
      expect(notifSettings.morning_time).toBe("08:00");

      await updateNotificationSettings({
        enabled: true,
        morning_time: "07:30",
        evening_time: "20:30",
      });

      const updatedNotif = await getNotificationSettings();
      expect(updatedNotif.enabled).toBe(true);
      expect(updatedNotif.morning_time).toBe("07:30");

      // Verify safe trigger check does not throw in test/offline environment
      await expect(checkAndTriggerHabitReminders(3)).resolves.not.toThrow();
      await expect(checkAndTriggerHabitReminders([])).resolves.not.toThrow();
    });
  });

  describe("Schema v4 Full Backup Export & Sync Merge", () => {
    it("exports full v4 backup containing notes, finance, and files, and validates import", async () => {
      await localNotesStore.createNote({ title: "Note 1", content: "Content 1" });
      await localFinanceStore.createTransaction({ type: "expense", category: "Food", amount: 20, date: "2026-11-23" });
      await localFileSystemStore.saveFile({ name: "doc.txt", type: "text/plain", size: 5, dataBase64: "dGVzdA==" });

      const exported = await exportLocalData();
      expect(exported.schema_version).toBe(4);
      expect(exported.data.notes).toHaveLength(1);
      expect(exported.data.finance_transactions).toHaveLength(1);
      expect(exported.data.stored_files).toHaveLength(1);

      const json = JSON.stringify(exported);
      const parsed = parseBackup(json);
      expect(parsed.ok).toBe(true);

      if (parsed.ok) {
        await replaceLocalData(parsed.backup);
        const restoredNotes = await localNotesStore.listNotes();
        expect(restoredNotes).toHaveLength(1);
        expect(restoredNotes[0].title).toBe("Note 1");

        const restoredTransactions = await localFinanceStore.listTransactions();
        expect(restoredTransactions).toHaveLength(1);

        const restoredFiles = await localFileSystemStore.listFiles();
        expect(restoredFiles).toHaveLength(1);
      }
    });

    it("merges two v4 backups without data loss (incremental sync merge)", async () => {
      await localNotesStore.createNote({ title: "Vault Note A", content: "From Device 1" });

      const exportedDev1 = await exportLocalData();

      // Clear notes and populate device 2 with a distinct note
      const currentVault = await readVaultData();
      await replaceLocalData({
        app: "habitflow-lifeos",
        schema_version: 4,
        exported_at: new Date().toISOString(),
        data: {
          ...currentVault,
          notes: [{ id: "n2", title: "Vault Note B", content: "From Device 2", folder: "Work", tags: [], is_pinned: false, is_archived: false, created_at: "2026-11-23T10:00:00Z", updated_at: "2026-11-23T10:00:00Z" }],
        },
      });

      // Now merge device 1's backup into device 2's vault
      await mergeLocalData(exportedDev1);

      const allNotes = await localNotesStore.listNotes();
      expect(allNotes).toHaveLength(2);
      const titles = allNotes.map((n) => n.title);
      expect(titles).toContain("Vault Note A");
      expect(titles).toContain("Vault Note B");
    });
  });

  describe("Built-in Offline Heuristic AI Engine", () => {
    it("generates habit analysis, stacks, and reflections without Ollama daemon", async () => {
      const {
        generateHeuristicHabitAnalysis,
        generateHeuristicHabitStack,
        generateHeuristicStoicBoost,
        generateHeuristicResponse,
      } = await import("../ai/localHeuristicEngine");

      const mockHabits = [
        { id: "h1", name: "Morning Meditation", type: "do" as const, is_active: true },
        { id: "h2", name: "Afternoon Walk", type: "do" as const, is_active: true },
        { id: "h3", name: "Doomscrolling", type: "dont" as const, is_active: true },
      ];

      const analysis = generateHeuristicHabitAnalysis(mockHabits);
      expect(analysis).toContain("Local System Analysis");
      expect(analysis).toContain("3 habits");

      const stack = generateHeuristicHabitStack(mockHabits);
      expect(stack).toContain("Habit Stacking Protocol");
      expect(stack).toContain("Morning Momentum Stack");

      const stoic = generateHeuristicStoicBoost(mockHabits);
      expect(stoic).toContain("Stoic Reflection");

      const qna = generateHeuristicResponse("How do I beat procrastination?", mockHabits);
      expect(qna).toContain("Defeating Habit Resistance");
      expect(qna).toContain("5-Minute Rule");
    });
  });

  describe("Emergency Vault Recovery Kit & Passphrase Strength", () => {
    it("evaluates passphrase entropy accurately", async () => {
      const { evaluatePassphraseStrength } = await import("./emergencyKit");

      expect(evaluatePassphraseStrength("short").label).toBe("Too Short");
      expect(evaluatePassphraseStrength("twelvecharac").score).toBeGreaterThanOrEqual(1);
      expect(evaluatePassphraseStrength("correct-horse-battery-staple-2026").score).toBeGreaterThanOrEqual(3);
      expect(evaluatePassphraseStrength("C0rr3ct!H0rs3#B@tt3ry$St@pl3%2026").label).toBe("Very Strong");
    });

    it("generates complete Emergency Recovery Kit HTML document", async () => {
      const { generateEmergencyKitHtml } = await import("./emergencyKit");

      const html = await generateEmergencyKitHtml("My favorite author");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Emergency Vault Recovery Kit");
      expect(html).toContain("My favorite author");
      expect(html).toContain("Schema Version: 4.0");
    });
  });
});
