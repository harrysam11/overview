import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.clear();
      }
      window.location.href = "/";
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
          <Card className="w-full max-w-lg border-destructive/30 shadow-xl">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                HabitFlow encountered an unexpected error while rendering this screen. Your encrypted data on device remains safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {this.state.error && (
                <div className="rounded-lg bg-muted p-3 text-xs font-mono text-destructive break-all max-h-40 overflow-auto border">
                  <strong>{this.state.error.name}:</strong> {this.state.error.message}
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:underline">View component stack</summary>
                  <pre className="mt-2 p-2 bg-muted/60 rounded text-[11px] overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={this.handleResetStorage} className="gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" />
                Go to Home
              </Button>
              <Button size="sm" onClick={this.handleReload} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                Reload Application
              </Button>
            </CardFooter>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
