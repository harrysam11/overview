import { supabase } from "@/integrations/supabase/client";
import type { IdeasStore, IdeaCategory, IdeaCard } from "./ideasStore";

export const cloudIdeasStore: IdeasStore = {
  mode: "cloud",

  async listData(): Promise<{ categories: IdeaCategory[]; cards: IdeaCard[] }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { categories: [], cards: [] };

    const [catRes, cardRes] = await Promise.all([
      supabase.from("idea_categories").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("idea_cards").select("*").eq("user_id", user.id).order("sort_order"),
    ]);

    if (catRes.error) throw catRes.error;
    if (cardRes.error) throw cardRes.error;

    return {
      categories: (catRes.data || []) as IdeaCategory[],
      cards: (cardRes.data || []) as IdeaCard[],
    };
  },

  async addCategory(name: string): Promise<IdeaCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { count } = await supabase
      .from("idea_categories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data, error } = await supabase
      .from("idea_categories")
      .insert({ user_id: user.id, name, sort_order: count || 0 })
      .select()
      .single();

    if (error) throw error;
    return data as IdeaCategory;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from("idea_categories").delete().eq("id", id);
    if (error) throw error;
  },

  async addCard(categoryId: string, title: string): Promise<IdeaCard> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { count } = await supabase
      .from("idea_cards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("category_id", categoryId);

    const { data, error } = await supabase
      .from("idea_cards")
      .insert({ user_id: user.id, category_id: categoryId, title, sort_order: count || 0 })
      .select()
      .single();

    if (error) throw error;
    return data as IdeaCard;
  },

  async updateCard(id: string, updates: Partial<Pick<IdeaCard, "title" | "content">>): Promise<void> {
    const { error } = await supabase.from("idea_cards").update(updates).eq("id", id);
    if (error) throw error;
  },

  async deleteCard(id: string): Promise<void> {
    const { error } = await supabase.from("idea_cards").delete().eq("id", id);
    if (error) throw error;
  },

  async moveCard(cardId: string, newCategoryId: string): Promise<void> {
    const { error } = await supabase
      .from("idea_cards")
      .update({ category_id: newCategoryId })
      .eq("id", cardId);
    if (error) throw error;
  },
};
