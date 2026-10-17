import { useNavigate } from "react-router-dom";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  feature: string;
  reason: "online" | "later";
}

const LocalOnlyNotice = ({ feature, reason }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> {feature}</CardTitle>
          <CardDescription>
            {reason === "online"
              ? "This feature needs other people and an online service, so it is turned off in local mode. Its code is kept for later."
              : "This area is not saved on this device yet. It will move to local storage in a later step."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => navigate("/dashboard")}>Back to LifeOS</Button>
          <Button variant="outline" onClick={() => navigate("/habits")}>Open habits</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalOnlyNotice;
