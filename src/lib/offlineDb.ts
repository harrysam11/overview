import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "habitflow-offline";
const DB_VERSION = 1;

interface SyncQueueItem {
  id: string;
  table: string;
  operation: "insert" | "update" | "upsert" | "delete";
  data: Record<string, unknown>;
  conflictColumn?: string;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Cache store for each table's data
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache");
        }
        // Queue for offline mutations
        if (!db.objectStoreNames.contains("syncQueue")) {
          const store = db.createObjectStore("syncQueue", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
        }
      },
    });
  }
  return dbPromise;
}

// --- Cache operations ---

export async function getCachedData<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get("cache", key);
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const db = await getDb();
  await db.put("cache", data, key);
}

export async function clearCachedData(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("cache", key);
}

// --- Sync queue operations ---

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "timestamp">): Promise<void> {
  const db = await getDb();
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  await db.put("syncQueue", entry);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAllFromIndex("syncQueue", "timestamp");
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("syncQueue", id);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDb();
  return db.count("syncQueue");
}
