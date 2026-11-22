import { Link } from "react-router-dom";
import { HardDrive, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const LocalModeBadge = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button aria-label="About local mode">
        <Badge variant="outline" className="gap-1.5 cursor-pointer">
          <HardDrive className="h-3 w-3" /> <LockKeyhole className="h-3 w-3" /> Local mode
        </Badge>
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-72 text-sm space-y-2">
      <p className="font-medium">Your data stays on this device</p>
      <p className="text-muted-foreground">
        Habits, daily check-ins and journal entries are saved in this browser only. Nothing is sent online and there is no account.
      </p>
      <p className="text-muted-foreground">
        Clearing this browser's site data deletes them, so export a backup regularly.
      </p>
      <Link to="/data" className="underline underline-offset-4">Backup &amp; restore</Link>
    </PopoverContent>
  </Popover>
);
