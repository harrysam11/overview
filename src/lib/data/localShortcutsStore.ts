import { newId, nowIso } from "@/lib/local/localDb";
import { localShortcutSchema, type LocalShortcut } from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { ShortcutsStore, AppShortcut } from "./shortcutsStore";

export const localShortcutsStore: ShortcutsStore = {
  mode: "local",

  async listShortcuts(): Promise<AppShortcut[]> {
    const data = await readVaultData();
    const shortcuts = data.shortcuts || [];
    return [...shortcuts].sort((a, b) => a.sort_order - b.sort_order);
  },

  async addShortcut(name: string, url: string): Promise<AppShortcut> {
    const now = nowIso();
    const data = await readVaultData();
    const existing = data.shortcuts || [];
    const maxSort = existing.length > 0 ? Math.max(...existing.map((s) => s.sort_order)) + 1 : 0;
    const newShortcut: LocalShortcut = localShortcutSchema.parse({
      id: newId(),
      name: name.trim().slice(0, 100),
      url: url.trim().slice(0, 2000),
      favicon_url: null,
      sort_order: maxSort,
      created_at: now,
    });
    await updateVaultData((current) => ({
      ...current,
      shortcuts: [...(current.shortcuts || []), newShortcut],
    }));
    return newShortcut;
  },

  async updateShortcut(id: string, name: string, url: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      shortcuts: (current.shortcuts || []).map((s) =>
        s.id === id
          ? {
              ...s,
              name: name.trim().slice(0, 100),
              url: url.trim().slice(0, 2000),
            }
          : s
      ),
    }));
  },

  async deleteShortcut(id: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      shortcuts: (current.shortcuts || []).filter((s) => s.id !== id),
    }));
  },
};
