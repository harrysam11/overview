import { StickyNote, Loader2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useScratchPad } from "@/hooks/useScratchPad";

export const ScratchPad = () => {
  const { content, updateContent, loading, saving } = useScratchPad();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Scratch Pad
          </span>
          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-3 w-3" />
                Saved
              </>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Jot down quick thoughts, ideas, reminders..."
            className="min-h-[120px] resize-y border-dashed bg-muted/30 focus:bg-background transition-colors"
          />
        )}
      </CardContent>
    </Card>
  );
};
