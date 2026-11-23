import { APP_MODE, type AppMode } from "@/lib/appMode";

export interface ScratchPadStore {
  mode: AppMode;
  getNotes(): Promise<string>;
  saveNotes(content: string): Promise<void>;
}

let storePromise: Promise<ScratchPadStore> | null = null;

export const getScratchPadStore = (mode: AppMode = APP_MODE): Promise<ScratchPadStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudScratchPadStore").then((m) => m.cloudScratchPadStore)
        : import("./localScratchPadStore").then((m) => m.localScratchPadStore);
  }
  return storePromise;
};
