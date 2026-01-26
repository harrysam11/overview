import { useEffect, useState } from "react";
import {
  User,
  Sword,
  Shield,
  Anchor,
  Medal,
  Star,
  Target,
  Crown,
  Flame,
  Trophy,
  HelpCircle,
} from "lucide-react";
import { LevelDefinition } from "@/hooks/useLevel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Sword,
  Shield,
  Anchor,
  Medal,
  Star,
  Target,
  Crown,
  Flame,
  Trophy,
};

const levelColors: Record<number, string> = {
  1: "text-gray-500",
  2: "text-green-500",
  3: "text-blue-500",
  4: "text-cyan-500",
  5: "text-purple-500",
  6: "text-pink-500",
  7: "text-orange-500",
  8: "text-yellow-500",
  9: "text-red-500",
  10: "text-amber-400",
};

const levelBgColors: Record<number, string> = {
  1: "bg-gray-500/20",
  2: "bg-green-500/20",
  3: "bg-blue-500/20",
  4: "bg-cyan-500/20",
  5: "bg-purple-500/20",
  6: "bg-pink-500/20",
  7: "bg-orange-500/20",
  8: "bg-yellow-500/20",
  9: "bg-red-500/20",
  10: "bg-amber-400/20",
};

interface LevelUpModalProps {
  level: LevelDefinition | null;
  onDismiss: () => void;
}

export const LevelUpModal = ({ level, onDismiss }: LevelUpModalProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (level) {
      setOpen(true);
    }
  }, [level]);

  const handleClose = () => {
    setOpen(false);
    onDismiss();
  };

  if (!level) return null;

  const IconComponent = iconMap[level.icon] || HelpCircle;
  const levelColor = levelColors[level.level] || "text-primary";
  const levelBg = levelBgColors[level.level] || "bg-primary/20";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            ⬆️ Level Up!
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className={cn("p-6 rounded-full animate-scale-in", levelBg)}>
            <IconComponent className={cn("h-16 w-16", levelColor)} />
          </div>
          
          <div className="space-y-2">
            <p className="text-muted-foreground">You've reached</p>
            <h3 className={cn("text-3xl font-bold", levelColor)}>
              Level {level.level}
            </h3>
            <p className={cn("text-2xl font-semibold", levelColor)}>
              {level.title}
            </p>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full">
          Continue Journey
        </Button>
      </DialogContent>
    </Dialog>
  );
};
