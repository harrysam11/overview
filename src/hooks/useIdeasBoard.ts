import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getIdeasStore, type IdeaCategory, type IdeaCard } from "@/lib/data/ideasStore";

export type { IdeaCategory, IdeaCard };

export const useIdeasBoard = () => {
  const [categories, setCategories] = useState<IdeaCategory[]>([]);
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const store = await getIdeasStore();
      const { categories: cats, cards: c } = await store.listData();
      setCategories(cats);
      setCards(c);
    } catch {
      toast({ description: "Failed to load ideas board.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addCategory = async (name: string) => {
    try {
      const store = await getIdeasStore();
      const newCat = await store.addCategory(name);
      setCategories((prev) => [...prev, newCat]);
    } catch {
      toast({ description: "Failed to add category.", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const store = await getIdeasStore();
      await store.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setCards((prev) => prev.filter((c) => c.category_id !== id));
    } catch {
      toast({ description: "Failed to delete category.", variant: "destructive" });
    }
  };

  const addCard = async (categoryId: string, title: string) => {
    try {
      const store = await getIdeasStore();
      const newCard = await store.addCard(categoryId, title);
      setCards((prev) => [...prev, newCard]);
    } catch {
      toast({ description: "Failed to add card.", variant: "destructive" });
    }
  };

  const updateCard = async (id: string, updates: Partial<Pick<IdeaCard, "title" | "content">>) => {
    try {
      const store = await getIdeasStore();
      await store.updateCard(id, updates);
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    } catch {
      toast({ description: "Failed to update card.", variant: "destructive" });
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const store = await getIdeasStore();
      await store.deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast({ description: "Failed to delete card.", variant: "destructive" });
    }
  };

  const moveCard = async (cardId: string, newCategoryId: string) => {
    try {
      const store = await getIdeasStore();
      await store.moveCard(cardId, newCategoryId);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, category_id: newCategoryId } : c)));
    } catch {
      toast({ description: "Failed to move card.", variant: "destructive" });
    }
  };

  return { categories, cards, loading, addCategory, deleteCategory, addCard, updateCard, deleteCard, moveCard };
};
