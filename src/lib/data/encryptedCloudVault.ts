import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { backupCounts, exportLocalData, mergeLocalData, parseBackup } from "@/lib/local/backup";
import { LIMITS, type LocalBackup } from "@/lib/local/schema";

const KDF_ITERATIONS = 310_000;
const ENVELOPE_VERSION = 1;
const APP_ID = "habitflow-lifeos";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

const envelopeSchema = z.object({
  app: z.literal(APP_ID),
  format: z.literal("encrypted-cloud-vault"),
  version: z.literal(ENVELOPE_VERSION),
  kdf: z.literal("PBKDF2-SHA256"),
  iterations: z.literal(KDF_ITERATIONS),
  salt: z.string().min(20).max(64),
  iv: z.string().min(16).max(32),
  ciphertext: z.string().min(1).max(22_000_000),
});

type Envelope = z.infer<typeof envelopeSchema>;

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const randomBytes = (length: number): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const deriveKey = async (passphrase: string, salt: Uint8Array<ArrayBuffer>) => {
  if (!globalThis.crypto?.subtle) throw new Error("Secure encryption is unavailable in this browser. Use HTTPS.");
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const additionalData = (userId: string) => encoder.encode(`${APP_ID}:cloud-vault:${userId}:v1`);

const encryptBackup = async (backup: LocalBackup, passphrase: string, userId: string): Promise<Envelope> => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(userId), tagLength: 128 },
    key,
    encoder.encode(JSON.stringify(backup)),
  );
  const envelope: Envelope = {
    app: APP_ID,
    format: "encrypted-cloud-vault",
    version: ENVELOPE_VERSION,
    kdf: "PBKDF2-SHA256",
    iterations: KDF_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  if (encoder.encode(JSON.stringify(envelope)).byteLength > LIMITS.maxImportBytes) {
    throw new Error("Encrypted cloud backup exceeds the 15 MB limit. Export a local backup and reduce large attachments.");
  }
  return envelope;
};

const decryptBackup = async (value: unknown, passphrase: string, userId: string): Promise<LocalBackup> => {
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) throw new Error("Cloud vault format is invalid or unsupported.");
  try {
    const envelope = parsed.data;
    const salt = fromBase64(envelope.salt);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(envelope.iv), additionalData: additionalData(userId), tagLength: 128 },
      key,
      fromBase64(envelope.ciphertext),
    );
    const result = parseBackup(decoder.decode(plaintext));
    if (!result.ok) throw new Error(result.error);
    return result.backup;
  } catch (error) {
    if (error instanceof Error && error.message !== "The operation failed for an operation-specific reason") {
      throw new Error("Cloud passphrase is incorrect or the encrypted vault is damaged.");
    }
    throw error;
  }
};

export interface EncryptedCloudSyncResult {
  version: number;
  counts: ReturnType<typeof backupCounts>;
  restoredRemote: boolean;
}

/**
 * Merge the remote encrypted snapshot into the local vault, then upload the
 * merged result as a new encrypted snapshot. Neither copy is deleted.
 * A compare-and-swap version update prevents silently overwriting concurrent syncs.
 */
export const syncEncryptedCloudVault = async (
  credentials: { email: string; password: string },
  passphrase: string,
): Promise<EncryptedCloudSyncResult> => {
  if (passphrase.length < 12 || passphrase.length > 1024) {
    throw new Error("Use a cloud passphrase between 12 and 1,024 characters.");
  }
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword(credentials);
  if (authError || !authData.user) throw new Error(authError?.message || "Cloud authentication failed.");

  const userId = authData.user.id;
  try {
    const { data: remote, error: readError } = await supabase
      .from("encrypted_vaults")
      .select("payload, version")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw new Error(`Could not read encrypted cloud vault: ${readError.message}`);

    if (remote) {
      const remoteBackup = await decryptBackup(remote.payload, passphrase, userId);
      await mergeLocalData(remoteBackup);
    }

    const mergedBackup = await exportLocalData();
    const payload = await encryptBackup(mergedBackup, passphrase, userId);
    const nextVersion = (remote?.version ?? 0) + 1;

    if (remote) {
      const { data: updated, error: updateError } = await supabase
        .from("encrypted_vaults")
        .update({ payload, version: nextVersion, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("version", remote.version)
        .select("version")
        .maybeSingle();
      if (updateError) throw new Error(`Could not update encrypted cloud vault: ${updateError.message}`);
      if (!updated) throw new Error("Another device synced at the same time. Your local and cloud data are safe; sync again.");
    } else {
      const { error: insertError } = await supabase.from("encrypted_vaults").insert({
        user_id: userId,
        payload,
        version: nextVersion,
      });
      if (insertError) {
        if (insertError.code === "23505") throw new Error("A cloud vault was created by another device. Sync again to merge it safely.");
        throw new Error(`Could not create encrypted cloud vault: ${insertError.message}`);
      }
    }

    return {
      version: nextVersion,
      counts: backupCounts(mergedBackup),
      restoredRemote: Boolean(remote),
    };
  } finally {
    await supabase.auth.signOut().catch(() => {});
  }
};
