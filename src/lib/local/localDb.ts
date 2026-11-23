import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { LOCAL_SCHEMA_VERSION, type LocalDailyRecord, type LocalHabit, type LocalJournalEntry } from "./schema";

export interface EncryptedVaultRecord {
  id: "primary";
  version: 1;
  revision: number;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export const LOCAL_DB_NAME = "habitflow-local";

export interface LocalDbSchema extends DBSchema {
  habits: { key: string; value: LocalHabit };
  daily_records: {
    key: string;
    value: LocalDailyRecord;
    indexes: { by_date: string; by_date_habit: [string, string] };
  };
  journal_entries: { key: string; value: LocalJournalEntry; indexes: { by_date: string } };
  meta: { key: string; value: unknown };
  vault: { key: string; value: EncryptedVaultRecord };
}

export class LocalStoreError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "LocalStoreError";
  }
}

let dbPromise: Promise<IDBPDatabase<LocalDbSchema>> | null = null;

export const getLocalDb = () => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new LocalStoreError("This browser does not support local storage (IndexedDB)."));
  }
  if (!dbPromise) {
    dbPromise = openDB<LocalDbSchema>(LOCAL_DB_NAME, LOCAL_SCHEMA_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1: initial layout. Future versions add `if (oldVersion < N)` steps; never drop user data.
        if (oldVersion < 1) {
          db.createObjectStore("habits", { keyPath: "id" });
          const records = db.createObjectStore("daily_records", { keyPath: "id" });
          records.createIndex("by_date", "record_date");
          records.createIndex("by_date_habit", ["record_date", "habit_id"], { unique: true });
          const journal = db.createObjectStore("journal_entries", { keyPath: "id" });
          journal.createIndex("by_date", "entry_date", { unique: true });
          db.createObjectStore("meta");
        }
        if (oldVersion < 2) {
          db.createObjectStore("vault", { keyPath: "id" });
        }
        if (oldVersion < 3) {
          // Version 3: All remaining tools migrated to the encrypted vault.
          // Additive step: existing stores and vault records are preserved untouched.
        }
        if (oldVersion < 4) {
          // Version 4: Notes, Expenses & Investments, Stored Files, AI & Notification Settings.
          // Additive step: existing stores and encrypted records are preserved untouched.
        }
      },
      blocked() {
        console.warn("Local database upgrade is waiting for another open tab to close.");
      },
    }).catch((err) => {
      dbPromise = null;
      throw new LocalStoreError("Could not open local data on this device.", err);
    });
  }
  return dbPromise;
};

/** Test/helper: close the connection so a fresh database can be opened. */
export const closeLocalDb = async () => {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      /* ignore */
    }
  }
  dbPromise = null;
};

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const nowIso = () => new Date().toISOString();
