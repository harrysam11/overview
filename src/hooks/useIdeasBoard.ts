import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface IdeaCategory {
  id: string;
  name: string;
  sort_order: number;
  color: string;
}

export interface IdeaCard {
  id: string;
  category_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
}

export const useIdeasBoard = () => {
  const [categories, setCategories] = useState<IdeaCategory[]>([]);
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [catRes, cardRes] = await Promise.all([
        supabase.from("idea_categories").select("*").eq("user_id", user.id).order("sort_order"),
        supabase.from("idea_cards").select("*").eq("user_id", user.id).order("sort_order"),
      ]);

      if (catRes.error) throw catRes.error;
      if (cardRes.error) throw cardRes.error;

      setCategories(catRes.data || []);
      setCards(cardRes.data || []);
    } catch {
      toast({ description: "Failed to load ideas board.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const addCategory = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("idea_categories")
        .insert({ user_id: user.id, name, sort_order: categories.length })
        .select()
        .single();

      if (error) throw error;
      setCategories([...categories, data as IdeaCategory]);
    } catch {
      toast({ description: "Failed to add category.", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("idea_categories").delete().eq("id", id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      setCards(cards.filter(c => c.category_id !== id));
    } catch {
      toast({ description: "Failed to delete category.", variant: "destructive" });
    }
  };

  const addCard = async (categoryId: string, title: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const categoryCards = cards.filter(c => c.category_id === categoryId);
      const { data, error } = await supabase
        .from("idea_cards")
        .insert({ user_id: user.id, category_id: categoryId, title, sort_order: categoryCards.length })
        .select()
        .single();

      if (error) throw error;
      setCards([...cards, data as IdeaCard]);
    } catch {
      toast({ description: "Failed to add card.", variant: "destructive" });
    }
  };

  const updateCard = async (id: string, updates: Partial<Pick<IdeaCard, "title" | "content">>) => {
    try {
      const { error } = await supabase.from("idea_cards").update(updates).eq("id", id);
      if (error) throw error;
      setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch {
      toast({ description: "Failed to update card.", variant: "destructive" });
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const { error } = await supabase.from("idea_cards").delete().eq("id", id);
      if (error) throw error;
      setCards(cards.filter(c => c.id !== id));
    } catch {
      toast({ description: "Failed to delete card.", variant: "destructive" });
    }
  };

  const moveCard = async (cardId: string, newCategoryId: string) => {
    try {
      const { error } = await supabase
        .from("idea_cards")
        .update({ category_id: newCategoryId })
        .eq("id", cardId);
      if (error) throw error;
      setCards(cards.map(c => c.id === cardId ? { ...c, category_id: newCategoryId } : c));
    } catch {
      toast({ description: "Failed to move card.", variant: "destructive" });
    }
  };

  return { categories, cards, loading, addCategory, deleteCategory, addCard, updateCard, deleteCard, moveCard };
};
