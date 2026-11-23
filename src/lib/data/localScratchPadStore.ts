import { nowIso } from "@/lib/local/localDb";
import { localScratchPadSchema } from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { ScratchPadStore } from "./scratchPadStore";

export const localScratchPadStore: ScratchPadStore = {
  mode: "local",

  async getNotes(): Promise<string> {
    const data = await readVaultData();
    return data.scratch_pad?.content || "";
  },

  async saveNotes(content: string): Promise<void> {
    const validated = localScratchPadSchema.parse({
      content,
      updated_at: nowIso(),
    });
    await updateVaultData((current) => ({
      ...current,
      scratch_pad: validated,
    }));
  },
};
