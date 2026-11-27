import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { signIn, resetPassword } from "@/lib/supabase";

type AuthMode = "login" | "forgot";

export const AuthForm = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast({ title: "Reset email sent", description: "Check your inbox for a password reset link." });
        setMode("login");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "Welcome back", description: "You have successfully signed in." });
      }
    } catch {
      toast({
        title: "Authentication failed",
        description: "Unable to sign in or send a reset link. Check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            {mode === "forgot" ? "Reset password" : "Owner sign in"}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === "forgot" ? "Enter your owner email to receive a reset link" : "Sign in to your private HabitFlow instance"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Owner email</Label>
              <Input id="email" type="email" autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === "login" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                <Input id="password" type="password" autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={12} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>
          {mode === "forgot" && (
            <div className="mt-4 text-center text-sm">
              <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">
                Back to sign in
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};
