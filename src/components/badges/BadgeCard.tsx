import { Badge } from "@/hooks/useBadges";
import { BadgeIcon } from "./BadgeIcon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface BadgeCardProps {
  badge: Badge;
  earned?: boolean;
  earnedAt?: string;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

export const BadgeCard = ({ 
  badge, 
  earned = false, 
  earnedAt,
  showDetails = true,
  size = "md"
}: BadgeCardProps) => {
  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <BadgeIcon 
            icon={badge.icon} 
            rarity={badge.rarity} 
            earned={earned}
            size={size}
          />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
            {earned && earnedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Earned {format(new Date(earnedAt), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        earned 
          ? "bg-card border-border" 
          : "bg-muted/30 border-transparent opacity-60"
      )}
    >
      <BadgeIcon 
        icon={badge.icon} 
        rarity={badge.rarity} 
        earned={earned}
        size={size}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn(
            "font-semibold truncate",
            !earned && "text-muted-foreground"
          )}>
            {badge.name}
          </h4>
          <span className={cn(
            "text-xs font-medium",
            rarityTextColors[badge.rarity]
          )}>
            {rarityLabels[badge.rarity]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {badge.description}
        </p>
        {earned && earnedAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Earned {format(new Date(earnedAt), "MMM d, yyyy")}
          </p>
        )}
      </div>
    </div>
  );
};
