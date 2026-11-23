import { APP_MODE, type AppMode } from "@/lib/appMode";

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
  content: string | null;
  sort_order: number;
  created_at: string;
}

export interface IdeasStore {
  mode: AppMode;
  listData(): Promise<{ categories: IdeaCategory[]; cards: IdeaCard[] }>;
  addCategory(name: string): Promise<IdeaCategory>;
  deleteCategory(id: string): Promise<void>;
  addCard(categoryId: string, title: string): Promise<IdeaCard>;
  updateCard(id: string, updates: Partial<Pick<IdeaCard, "title" | "content">>): Promise<void>;
  deleteCard(id: string): Promise<void>;
  moveCard(cardId: string, newCategoryId: string): Promise<void>;
}

let storePromise: Promise<IdeasStore> | null = null;

export const getIdeasStore = (mode: AppMode = APP_MODE): Promise<IdeasStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudIdeasStore").then((m) => m.cloudIdeasStore)
        : import("./localIdeasStore").then((m) => m.localIdeasStore);
  }
  return storePromise;
};
