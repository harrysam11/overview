import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBadges } from "@/hooks/useBadges";
import { BadgeCard } from "./BadgeCard";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { id: "all", label: "All" },
  { id: "streak", label: "Streak" },
  { id: "habits", label: "Habits" },
  { id: "journal", label: "Journal" },
  { id: "social", label: "Social" },
  { id: "special", label: "Special" },
];

export const BadgeShowcase = () => {
  const { allBadges, earnedBadges, loading, isEarned } = useBadges();

  const earnedCount = earnedBadges.length;
  const totalCount = allBadges.length;

  const getEarnedAt = (badgeId: string) => {
    const earned = earnedBadges.find(eb => eb.badge_id === badgeId);
    return earned?.earned_at;
  };

  const filterBadges = (category: string) => {
    if (category === "all") return allBadges;
    return allBadges.filter(b => b.category === category);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {earnedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-1"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="mt-0">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filterBadges(cat.id).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No badges in this category
                  </p>
                ) : (
                  filterBadges(cat.id).map(badge => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      earned={isEarned(badge.id)}
                      earnedAt={getEarnedAt(badge.id)}
                      size="sm"
                    />
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
