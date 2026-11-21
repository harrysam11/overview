import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCAL_VAULT_LOCK_EVENT } from "@/components/LocalVaultGate";

export const LocalVaultLockButton = () => (
  <Button
    variant="ghost"
    size="icon"
    title="Lock local data"
    aria-label="Lock local data"
    onClick={() => window.dispatchEvent(new Event(LOCAL_VAULT_LOCK_EVENT))}
  >
    <LockKeyhole className="h-5 w-5" />
  </Button>
);