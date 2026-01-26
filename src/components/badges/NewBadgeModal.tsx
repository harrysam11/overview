import { useEffect, useState } from "react";
import { Badge } from "@/hooks/useBadges";
import { BadgeIcon } from "./BadgeIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const rarityLabels: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const rarityTextColors: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-500",
  epic: "text-purple-500",
  legendary: "text-yellow-500",
};

interface NewBadgeModalProps {
  badge: Badge | null;
  onDismiss: () => void;
}

export const NewBadgeModal = ({ badge, onDismiss }: NewBadgeModalProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (badge) {
      setOpen(true);
    }
  }, [badge]);

  const handleClose = () => {
    setOpen(false);
    onDismiss();
  };

  if (!badge) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            🎉 Achievement Unlocked!
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="animate-scale-in">
            <BadgeIcon 
              icon={badge.icon} 
              rarity={badge.rarity} 
              earned={true}
              size="lg"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold">{badge.name}</h3>
            <p className={cn(
              "text-sm font-medium",
              rarityTextColors[badge.rarity]
            )}>
              {rarityLabels[badge.rarity]} Badge
            </p>
            <p className="text-muted-foreground text-sm max-w-xs">
              {badge.description}
            </p>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full">
          Awesome!
        </Button>
      </DialogContent>
    </Dialog>
  );
};
