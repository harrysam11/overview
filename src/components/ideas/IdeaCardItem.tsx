import { useState } from "react";
import { Trash2, Edit2, Check, X, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IdeaCard, IdeaCategory } from "@/hooks/useIdeasBoard";

interface Props {
  card: IdeaCard;
  categories: IdeaCategory[];
  onUpdate: (id: string, updates: Partial<Pick<IdeaCard, "title" | "content">>) => void;
  onDelete: (id: string) => void;
  onMove: (cardId: string, newCategoryId: string) => void;
}

export const IdeaCardItem = ({ card, categories, onUpdate, onDelete, onMove }: Props) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content || "");

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate(card.id, { title: title.trim(), content: content.trim() });
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(card.title);
    setContent(card.content || "");
    setEditing(false);
  };

  const otherCategories = categories.filter(c => c.id !== card.category_id);

  if (editing) {
    return (
      <Card className="border-primary/50">
        <CardContent className="p-3 space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm"
            autoFocus
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add details..."
            className="text-sm min-h-[60px] resize-none"
          />
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setEditing(true)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{card.title}</p>
            {card.content && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.content}</p>
            )}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            {otherCategories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {otherCategories.map(cat => (
                    <DropdownMenuItem key={cat.id} onClick={() => onMove(card.id, cat.id)}>
                      Move to {cat.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(card.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
