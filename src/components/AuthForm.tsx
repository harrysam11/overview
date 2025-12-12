import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp, resetPassword } from "@/lib/supabase";
import { passwordSchema } from "@/lib/validation";

type AuthMode = "login" | "signup" | "forgot";

export const AuthForm = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password for signup
    if (mode === "signup") {
      const validation = passwordSchema.safeParse(password);
      if (!validation.success) {
        toast({
          title: "Invalid password",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }
    
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast({
          title: "Reset email sent!",
          description: "Check your inbox for a password reset link.",
        });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Welcome to HabitFlow!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: "Unable to complete authentication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "forgot": return "Reset Password";
      case "signup": return "Create account";
      default: return "Welcome back";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "forgot": return "Enter your email to receive a reset link";
      case "signup": return "Start tracking your habits today";
      default: return "Sign in to your HabitFlow account";
    }
  };

  const getButtonText = () => {
    if (loading) return "Loading...";
    switch (mode) {
      case "forgot": return "Send Reset Link";
      case "signup": return "Sign Up";
      default: return "Sign In";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-center">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                )}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {getButtonText()}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm space-y-2">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-primary hover:underline"
              >
                {mode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
