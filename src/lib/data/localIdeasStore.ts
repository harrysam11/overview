import { newId, nowIso } from "@/lib/local/localDb";
import {
  localIdeaCategorySchema,
  localIdeaCardSchema,
  type LocalIdeaCategory,
  type LocalIdeaCard,
} from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { IdeasStore, IdeaCategory, IdeaCard } from "./ideasStore";

export const localIdeasStore: IdeasStore = {
  mode: "local",

  async listData(): Promise<{ categories: IdeaCategory[]; cards: IdeaCard[] }> {
    const data = await readVaultData();
    const categories = (data.idea_categories || []).map((c) => ({
      id: c.id,
      name: c.name,
      sort_order: c.sort_order,
      color: c.color,
    }));
    const cards = (data.idea_cards || []).map((c) => ({
      id: c.id,
      category_id: c.category_id,
      title: c.title,
      content: c.content,
      sort_order: c.sort_order,
      created_at: c.created_at,
    }));

    return {
      categories: [...categories].sort((a, b) => a.sort_order - b.sort_order),
      cards: [...cards].sort((a, b) => a.sort_order - b.sort_order),
    };
  },

  async addCategory(name: string): Promise<IdeaCategory> {
    const now = nowIso();
    const data = await readVaultData();
    const existing = data.idea_categories || [];
    const newCat: LocalIdeaCategory = localIdeaCategorySchema.parse({
      id: newId(),
      name: name.trim(),
      color: "bg-blue-500",
      sort_order: existing.length,
      created_at: now,
    });
    await updateVaultData((current) => ({
      ...current,
      idea_categories: [...(current.idea_categories || []), newCat],
    }));
    return {
      id: newCat.id,
      name: newCat.name,
      sort_order: newCat.sort_order,
      color: newCat.color,
    };
  },

  async deleteCategory(id: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      idea_categories: (current.idea_categories || []).filter((c) => c.id !== id),
      idea_cards: (current.idea_cards || []).filter((c) => c.category_id !== id),
    }));
  },

  async addCard(categoryId: string, title: string): Promise<IdeaCard> {
    const now = nowIso();
    const data = await readVaultData();
    const existing = (data.idea_cards || []).filter((c) => c.category_id === categoryId);
    const newCard: LocalIdeaCard = localIdeaCardSchema.parse({
      id: newId(),
      category_id: categoryId,
      title: title.trim(),
      content: null,
      sort_order: existing.length,
      created_at: now,
      updated_at: now,
    });
    await updateVaultData((current) => ({
      ...current,
      idea_cards: [...(current.idea_cards || []), newCard],
    }));
    return {
      id: newCard.id,
      category_id: newCard.category_id,
      title: newCard.title,
      content: newCard.content,
      sort_order: newCard.sort_order,
      created_at: newCard.created_at,
    };
  },

  async updateCard(id: string, updates: Partial<Pick<IdeaCard, "title" | "content">>): Promise<void> {
    const now = nowIso();
    await updateVaultData((current) => ({
      ...current,
      idea_cards: (current.idea_cards || []).map((c) =>
        c.id === id ? { ...c, ...updates, updated_at: now } : c
      ),
    }));
  },

  async deleteCard(id: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      idea_cards: (current.idea_cards || []).filter((c) => c.id !== id),
    }));
  },

  async moveCard(cardId: string, newCategoryId: string): Promise<void> {
    const now = nowIso();
    await updateVaultData((current) => ({
      ...current,
      idea_cards: (current.idea_cards || []).map((c) =>
        c.id === cardId ? { ...c, category_id: newCategoryId, updated_at: now } : c
      ),
    }));
  },
};
