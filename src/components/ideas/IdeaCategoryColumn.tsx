import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IdeaCardItem } from "./IdeaCardItem";
import type { IdeaCard, IdeaCategory } from "@/hooks/useIdeasBoard";

interface Props {
  category: IdeaCategory;
  cards: IdeaCard[];
  allCategories: IdeaCategory[];
  onAddCard: (categoryId: string, title: string) => void;
  onUpdateCard: (id: string, updates: Partial<Pick<IdeaCard, "title" | "content">>) => void;
  onDeleteCard: (id: string) => void;
  onMoveCard: (cardId: string, newCategoryId: string) => void;
  onDeleteCategory: (id: string) => void;
}

export const IdeaCategoryColumn = ({
  category, cards, allCategories, onAddCard, onUpdateCard, onDeleteCard, onMoveCard, onDeleteCategory,
}: Props) => {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddCard(category.id, newTitle.trim());
    setNewTitle("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col w-72 shrink-0 bg-muted/40 rounded-lg border">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {category.name}
          <span className="text-xs text-muted-foreground font-normal">({cards.length})</span>
        </h3>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteCategory(category.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1 max-h-[60vh]">
        <div className="p-2 space-y-2">
          {cards.map(card => (
            <IdeaCardItem
              key={card.id}
              card={card}
              categories={allCategories}
              onUpdate={onUpdateCard}
              onDelete={onDeleteCard}
              onMove={onMoveCard}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        {adding ? (
          <div className="space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Card title..."
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              className="text-sm"
            />
            <div className="flex gap-1">
              <Button size="sm" className="flex-1" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add card
          </Button>
        )}
      </div>
    </div>
  );
};
