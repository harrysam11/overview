import { readVaultData, updateVaultData } from "@/lib/local/vault";
import { newId, nowIso } from "@/lib/local/localDb";
import type { FileSystemStore, StoredFileItem, SaveFileInput } from "./fileSystemStore";

export const localFileSystemStore: FileSystemStore = {
  async listFiles(): Promise<StoredFileItem[]> {
    const data = await readVaultData();
    return (data.stored_files || []).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getFile(id: string): Promise<StoredFileItem | null> {
    const data = await readVaultData();
    return (data.stored_files || []).find((f) => f.id === id) || null;
  },

  async saveFile(input: SaveFileInput): Promise<StoredFileItem> {
    const timestamp = nowIso();
    const newFile: StoredFileItem = {
      id: newId(),
      name: input.name.trim(),
      type: input.type || "application/octet-stream",
      size: input.size,
      data_base64: input.dataBase64,
      created_at: timestamp,
    };

    await updateVaultData((data) => ({
      ...data,
      stored_files: [newFile, ...(data.stored_files || [])],
    }));

    return newFile;
  },

  async deleteFile(id: string): Promise<void> {
    await updateVaultData((data) => ({
      ...data,
      stored_files: (data.stored_files || []).filter((f) => f.id !== id),
    }));
  },

  downloadFile(file: StoredFileItem): void {
    const link = document.createElement("a");
    link.href = `data:${file.type};base64,${file.data_base64}`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
