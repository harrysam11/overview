import type { LocalStoredFile } from "@/lib/local/schema";

export interface StoredFileItem extends LocalStoredFile {}

export interface SaveFileInput {
  name: string;
  type: string;
  dataBase64: string;
  size: number;
}

export interface FileSystemStore {
  listFiles(): Promise<StoredFileItem[]>;
  getFile(id: string): Promise<StoredFileItem | null>;
  saveFile(input: SaveFileInput): Promise<StoredFileItem>;
  deleteFile(id: string): Promise<void>;
  downloadFile(file: StoredFileItem): void;
}

export const getFileSystemStore = async (): Promise<FileSystemStore> => {
  const { localFileSystemStore } = await import("./localFileSystemStore");
  return localFileSystemStore;
};
