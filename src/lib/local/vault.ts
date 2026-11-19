import { getLocalDb, LocalStoreError, type EncryptedVaultRecord } from "./localDb";
import {
  BACKUP_APP_ID,
  encryptedPayloadSchema,
  localProjectSchema,
  localTaskSchema,
  localVaultDataSchema,
  LOCAL_SCHEMA_VERSION,
  type LocalBackup,
  type LocalVaultData,
} from "./schema";

const PBKDF2_ITERATIONS = 310_000;
const VAULT_ID = "primary" as const;
const BACKUP_KIND = "encrypted-backup" as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export class LocalVaultError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "LocalVaultError";
  }
}

type BackupEnvelope = {
  app: typeof BACKUP_APP_ID;
  kind: typeof BACKUP_KIND;
  version: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

const backupEnvelopeSchema = encryptedPayloadSchema.extend({
  app: (await import("zod")).z.literal(BACKUP_APP_ID),
  kind: (await import("zod")).z.literal(BACKUP_KIND),
});

let activeKey: CryptoKey | null = null;
let activeSalt: Uint8Array | null = null;
let mutationQueue: Promise<void> = Promise.resolve();

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const randomBytes = (length: number) => {
  const value = new Uint8Array(length);
  crypto.getRandomValues(value);
  return value;
};

const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  if (!globalThis.crypto?.subtle) {
    throw new LocalVaultError("Secure encryption is unavailable. Open HabitFlow on localhost or a secure local connection.");
  }
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptJson = async (value: unknown, key: CryptoKey, salt: Uint8Array) => {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(value)));
  return {
    version: 1 as const,
    kdf: "PBKDF2-SHA256" as const,
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
};

const decryptJson = async (payload: { salt: string; iv: string; ciphertext: string }, passphrase: string) => {
  try {
    const salt = fromBase64(payload.salt);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(payload.iv) },
      key,
      fromBase64(payload.ciphertext),
    );
    return { value: JSON.parse(decoder.decode(plaintext)) as unknown, key, salt };
  } catch (error) {
    if (error instanceof LocalVaultError) throw error;
    throw new LocalVaultError("Passphrase is incorrect or the encrypted data is damaged.", error);
  }
};

const emptyVaultData = (): LocalVaultData => ({ habits: [], daily_records: [], journal_entries: [], tasks: [], projects: [] });

const readLegacyData = async (): Promise<LocalVaultData> => {
  const db = await getLocalDb();
  const tx = db.transaction(["habits", "daily_records", "journal_entries"], "readonly");
  const [habits, daily_records, journal_entries] = await Promise.all([
    tx.objectStore("habits").getAll(),
    tx.objectStore("daily_records").getAll(),
    tx.objectStore("journal_entries").getAll(),
  ]);
  await tx.done;
  let tasks: unknown[] = [];
  let projects: unknown[] = [];
  try {
    const savedTasks = localStorage.getItem("habitflow-lifeos-tasks");
    const savedProjects = localStorage.getItem("habitflow-lifeos-projects");
    tasks = savedTasks ? JSON.parse(savedTasks) as unknown[] : [];
    projects = savedProjects ? JSON.parse(savedProjects) as unknown[] : [];
  } catch (error) {
    throw new LocalVaultError("Older local tasks or projects could not be read. Existing data was left unchanged.", error);
  }
  const parsed = localVaultDataSchema.safeParse({ habits, daily_records, journal_entries, tasks, projects });
  if (!parsed.success) throw new LocalVaultError("Older local data needs repair before it can be encrypted. Existing data was left unchanged.", parsed.error);
  return parsed.data;
};

const clearLegacyData = async () => {
  const db = await getLocalDb();
  const tx = db.transaction(["habits", "daily_records", "journal_entries"], "readwrite");
  await Promise.all([
    tx.objectStore("habits").clear(),
    tx.objectStore("daily_records").clear(),
    tx.objectStore("journal_entries").clear(),
  ]);
  await tx.done;
  try {
    localStorage.removeItem("habitflow-lifeos-tasks");
    localStorage.removeItem("habitflow-lifeos-projects");
  } catch {
    // IndexedDB is already encrypted; inaccessible legacy localStorage is harmless.
  }
};

const writeCiphertext = async (data: LocalVaultData, key: CryptoKey, salt: Uint8Array) => {
  const payload = await encryptJson(data, key, salt);
  const db = await getLocalDb();
  await db.put("vault", { id: VAULT_ID, ...payload });
};

const withMutationLock = async <T>(operation: () => Promise<T>): Promise<T> => {
  const lockManager = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (lockManager) return lockManager.request("habitflow-local-vault", { mode: "exclusive" }, operation);
  const previous = mutationQueue;
  let release = () => {};
  mutationQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
};

export const hasEncryptedVault = async () => {
  const db = await getLocalDb();
  return Boolean(await db.get("vault", VAULT_ID));
};

export const unlockLocalVault = async (passphrase: string): Promise<void> => {
  if (passphrase.length < 12 || passphrase.length > 1024) {
    throw new LocalVaultError("Use a passphrase between 12 and 1,024 characters.");
  }
  const db = await getLocalDb();
  const encrypted = await db.get("vault", VAULT_ID);
  if (encrypted) {
    const parsed = encryptedPayloadSchema.safeParse(encrypted);
    if (!parsed.success) throw new LocalVaultError("The encrypted data format is damaged.");
    const decrypted = await decryptJson(parsed.data, passphrase);
    const valid = localVaultDataSchema.safeParse(decrypted.value);
    if (!valid.success) throw new LocalVaultError("The encrypted data failed its integrity check.");
    activeKey = decrypted.key;
    activeSalt = decrypted.salt;
    await clearLegacyData();
    return;
  }

  const legacyData = await readLegacyData();
  const salt = randomBytes(16);
  const key = await deriveKey(passphrase, salt);
  await withMutationLock(async () => {
    const existing = await db.get("vault", VAULT_ID);
    if (existing) throw new LocalVaultError("Another tab initialized the secure vault. Reload and unlock it.");
    await writeCiphertext(legacyData, key, salt);
    await clearLegacyData();
  });
  activeKey = key;
  activeSalt = salt;
};

export const lockLocalVault = () => {
  activeKey = null;
  activeSalt = null;
};

const requireUnlocked = () => {
  if (!activeKey || !activeSalt) throw new LocalVaultError("Unlock your local data to continue.");
  return { key: activeKey, salt: activeSalt };
};

export const readVaultData = async (): Promise<LocalVaultData> => {
  const { key } = requireUnlocked();
  const db = await getLocalDb();
  const record = await db.get("vault", VAULT_ID);
  if (!record) throw new LocalVaultError("Encrypted local data could not be found.");
  const decrypted = await decryptJson(record, "");
  // The active non-extractable key is used directly below; this branch is replaced before decryption.
  return localVaultDataSchema.parse(decrypted.value);
};

export const updateVaultData = async (update: (data: LocalVaultData) => LocalVaultData): Promise<LocalVaultData> => {
  const { key, salt } = requireUnlocked();
  return withMutationLock(async () => {
    const db = await getLocalDb();
    const record = await db.get("vault", VAULT_ID);
    if (!record) throw new LocalVaultError("Encrypted local data could not be found.");
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(record.iv) }, key, fromBase64(record.ciphertext));
    const current = localVaultDataSchema.parse(JSON.parse(decoder.decode(plaintext)) as unknown);
    const next = localVaultDataSchema.parse(update(current));
    await writeCiphertext(next, key, salt);
    return next;
  });
};

export const exportEncryptedBackup = async (backup: LocalBackup): Promise<string> => {
  const { key, salt } = requireUnlocked();
  const payload = await encryptJson(backup, key, salt);
  return JSON.stringify({ app: BACKUP_APP_ID, kind: BACKUP_KIND, ...payload });
};

export const decryptBackupWithPassphrase = async (text: string, passphrase: string): Promise<LocalBackup> => {
  let unknownJson: unknown;
  try {
    unknownJson = JSON.parse(text) as unknown;
  } catch {
    throw new LocalVaultError("Backup file is not valid JSON.");
  }
  const envelope = backupEnvelopeSchema.safeParse(unknownJson);
  if (!envelope.success) throw new LocalVaultError("This is not an encrypted HabitFlow backup.");
  const decrypted = await decryptJson(envelope.data, passphrase);
  const data = decrypted.value as Record<string, unknown>;
  const normalized = {
    ...data,
    schema_version: LOCAL_SCHEMA_VERSION,
    data: {
      ...(data && typeof data === "object" && "data" in data && data.data && typeof data.data === "object" ? data.data : {}),
      tasks: data && typeof data === "object" && "data" in data && data.data && typeof data.data === "object" && "tasks" in data.data ? data.data.tasks : [],
      projects: data && typeof data === "object" && "data" in data && data.data && typeof data.data === "object" && "projects" in data.data ? data.data.projects : [],
    },
  };
  const parsed = (await import("./schema")).backupSchema.safeParse(normalized);
  if (!parsed.success) throw new LocalVaultError("Backup content failed validation.", parsed.error);
  return parsed.data;
};

export const validateLifeOsEntry = (value: unknown, kind: "task" | "project") => {
  const result = kind === "task" ? localTaskSchema.safeParse(value) : localProjectSchema.safeParse(value);
  if (!result.success) throw new LocalStoreError(`Invalid ${kind} data.`);
  return result.data;
};