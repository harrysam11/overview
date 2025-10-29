import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface JournalEntryProps {
  date: Date;
  content: string;
  onSave: (content: string) => void;
}

export const JournalEntry = ({ date, content, onSave }: JournalEntryProps) => {
  const [text, setText] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setText(content);
    setHasChanges(false);
  }, [content, date]);

  const handleChange = (value: string) => {
    setText(value);
    setHasChanges(value !== content);
  };

  const handleSave = () => {
    onSave(text);
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Daily Journal (+2 points)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="How did your day go? What did you learn? What are you grateful for?"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <Button
          onClick={handleSave}
          disabled={!hasChanges || !text.trim()}
          className="w-full"
        >
          {content ? "Update Journal" : "Save Journal"}
        </Button>
      </CardContent>
    </Card>
  );
};
