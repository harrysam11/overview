import {
  Footprints,
  Calendar,
  Shield,
  Crown,
  Trophy,
  Zap,
  Hammer,
  Star,
  Sparkles,
  Award,
  BookOpen,
  Pen,
  Brain,
  Scroll,
  Coins,
  Gem,
  Diamond,
  Users,
  Heart,
  Sparkle,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints,
  Calendar,
  Shield,
  Crown,
  Trophy,
  Zap,
  Hammer,
  Star,
  Sparkles,
  Award,
  BookOpen,
  Pen,
  Brain,
  Scroll,
  Coins,
  Gem,
  Diamond,
  Users,
  Heart,
  Sparkle,
};

const rarityColors: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-500",
  epic: "text-purple-500",
  legendary: "text-yellow-500",
};

const rarityBgColors: Record<string, string> = {
  common: "bg-muted",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-yellow-500/10",
};

const rarityBorderColors: Record<string, string> = {
  common: "border-muted-foreground/30",
  rare: "border-blue-500/50",
  epic: "border-purple-500/50",
  legendary: "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]",
};

interface BadgeIconProps {
  icon: string;
  rarity: string;
  earned?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const BadgeIcon = ({ 
  icon, 
  rarity, 
  earned = true, 
  size = "md",
  className 
}: BadgeIconProps) => {
  const IconComponent = iconMap[icon] || HelpCircle;
  
  const sizeClasses = {
    sm: "h-8 w-8 p-1.5",
    md: "h-12 w-12 p-2.5",
    lg: "h-16 w-16 p-3",
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-9 w-9",
  };

  return (
    <div
      className={cn(
        "rounded-full border-2 flex items-center justify-center transition-all duration-300",
        sizeClasses[size],
        earned ? rarityBgColors[rarity] : "bg-muted/50",
        earned ? rarityBorderColors[rarity] : "border-muted-foreground/20",
        !earned && "opacity-40 grayscale",
        className
      )}
    >
      <IconComponent 
        className={cn(
          iconSizeClasses[size],
          earned ? rarityColors[rarity] : "text-muted-foreground/50"
        )} 
      />
    </div>
  );
};
