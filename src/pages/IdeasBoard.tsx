import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IdeaCategoryColumn } from "@/components/ideas/IdeaCategoryColumn";
import { useIdeasBoard } from "@/hooks/useIdeasBoard";

const IdeasBoard = () => {
  const navigate = useNavigate();
  const { categories, cards, loading, addCategory, deleteCategory, addCard, updateCard, deleteCard, moveCard } = useIdeasBoard();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName.trim());
    setNewCategoryName("");
    setAddingCategory(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Ideas Board
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {categories.map(category => (
            <IdeaCategoryColumn
              key={category.id}
              category={category}
              cards={cards.filter(c => c.category_id === category.id)}
              allCategories={categories}
              onAddCard={addCard}
              onUpdateCard={updateCard}
              onDeleteCard={deleteCard}
              onMoveCard={moveCard}
              onDeleteCategory={deleteCategory}
            />
          ))}

          {/* Add category column */}
          <div className="w-72 shrink-0">
            {addingCategory ? (
              <div className="bg-muted/40 rounded-lg border p-3 space-y-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name..."
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") setAddingCategory(false); }}
                />
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1" onClick={handleAddCategory}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingCategory(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-12 border-dashed text-muted-foreground"
                onClick={() => setAddingCategory(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm mt-1">Create your first category to start organizing ideas!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default IdeasBoard;
