import { useState, useEffect } from "react";
import { Bot, Sparkles, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, Send, Settings2, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkOllamaStatus, promptLocalOllama, getAiSettings, updateAiSettings, type OllamaStatus } from "@/lib/ai/ollamaClient";
import { generateHeuristicResponse } from "@/lib/ai/localHeuristicEngine";
import type { LocalHabit } from "@/lib/local/schema";

interface OllamaHabitCoachProps {
  habits?: LocalHabit[];
  className?: string;
}

export const OllamaHabitCoach = ({ habits = [], className = "" }: OllamaHabitCoachProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<OllamaStatus>({
    online: false,
    models: [],
    activeModel: "llama3",
    endpoint: "http://127.0.0.1:11434",
  });
  const [checking, setChecking] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedEngine, setUsedEngine] = useState<"ollama" | "heuristic">("heuristic");

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endpointInput, setEndpointInput] = useState("http://127.0.0.1:11434");
  const [modelInput, setModelInput] = useState("llama3");
  const [systemPromptInput, setSystemPromptInput] = useState("");
  const [preferredEngine, setPreferredEngine] = useState<"auto" | "ollama" | "heuristic">("auto");

  const refreshStatus = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await checkOllamaStatus();
      setStatus(res);
      const s = await getAiSettings();
      setEndpointInput(s.endpoint);
      setModelInput(s.model);
      setSystemPromptInput(s.system_prompt);
    } catch (e: any) {
      setError(e.message || "Failed to check Ollama status");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await updateAiSettings({
        endpoint: endpointInput.trim() || "http://127.0.0.1:11434",
        model: modelInput.trim() || "llama3",
        system_prompt: systemPromptInput.trim(),
      });
      setSettingsOpen(false);
      await refreshStatus();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const getHabitContext = () => {
    if (!habits || habits.length === 0) return "User has no habits set yet.";
    const list = habits.map((h) => `- ${h.name} (${h.type === "do" ? "Build habit" : "Quit habit"})`).join("\n");
    return `Current tracked habits:\n${list}`;
  };

  const handleQuickPrompt = async (template: string) => {
    let finalPrompt = "";
    if (template === "analyze") {
      finalPrompt = "Analyze my current habits list. Provide actionable insights on consistency and burnout.";
    } else if (template === "stack") {
      finalPrompt = "Suggest an optimal morning and evening habit stacking protocol based on my habits.";
    } else if (template === "motivation") {
      finalPrompt = "Give me a stoic reflection and practical encouragement to overcome resistance today.";
    }

    setPrompt(finalPrompt);
    await handleSend(finalPrompt);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || generating) return;

    setGenerating(true);
    setError(null);
    setResponse(null);

    const shouldTryOllama = preferredEngine === "ollama" || (preferredEngine === "auto" && status.online);

    if (shouldTryOllama) {
      try {
        const context = getHabitContext();
        const result = await promptLocalOllama(textToSend, context);
        setResponse(result);
        setUsedEngine("ollama");
        setGenerating(false);
        return;
      } catch (err: any) {
        if (preferredEngine === "ollama") {
          setError(err.message || "Could not connect to Ollama daemon.");
          setGenerating(false);
          return;
        }
        // In auto mode, fallback gracefully to the built-in local engine!
      }
    }

    // Built-in offline heuristic engine
    try {
      const result = generateHeuristicResponse(textToSend, habits as any);
      setResponse(result);
      setUsedEngine("heuristic");
    } catch (err: any) {
      setError(err.message || "Could not generate offline coach insight");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className={`border-indigo-500/20 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Local AI Habit Coach
                <Badge
                  variant={status.online ? "default" : "secondary"}
                  className={`text-[10px] px-1.5 py-0 h-4 ${
                    status.online
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-indigo-500 hover:bg-indigo-600 text-white"
                  }`}
                >
                  {status.online ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Ollama ({status.activeModel})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Cpu className="h-2.5 w-2.5" />
                      Built-in Offline Engine
                    </span>
                  )}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {status.online
                  ? `Powered by local neural model (${status.activeModel}) • 100% private`
                  : "Powered by built-in local cognitive engine • Zero external software needed"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="AI Settings">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-indigo-500" />
                    AI Engine Preferences
                  </DialogTitle>
                  <DialogDescription>
                    Configure self-hosted AI models. Everything runs offline on your machine.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Execution Mode</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        type="button"
                        variant={preferredEngine === "auto" ? "default" : "outline"}
                        size="sm"
                        className="text-[11px] h-7"
                        onClick={() => setPreferredEngine("auto")}
                      >
                        Auto (Ollama + Fallback)
                      </Button>
                      <Button
                        type="button"
                        variant={preferredEngine === "ollama" ? "default" : "outline"}
                        size="sm"
                        className="text-[11px] h-7"
                        onClick={() => setPreferredEngine("ollama")}
                      >
                        Ollama LLM Only
                      </Button>
                      <Button
                        type="button"
                        variant={preferredEngine === "heuristic" ? "default" : "outline"}
                        size="sm"
                        className="text-[11px] h-7"
                        onClick={() => setPreferredEngine("heuristic")}
                      >
                        Built-in Engine
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ollama-endpoint" className="text-xs">Ollama Endpoint URL</Label>
                    <Input
                      id="ollama-endpoint"
                      value={endpointInput}
                      onChange={(e) => setEndpointInput(e.target.value)}
                      placeholder="http://127.0.0.1:11434"
                      className="text-xs h-8"
                    />
                    <p className="text-[11px] text-muted-foreground">Default is http://127.0.0.1:11434</p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ollama-model" className="text-xs">Active Ollama Model</Label>
                    <Input
                      id="ollama-model"
                      value={modelInput}
                      onChange={(e) => setModelInput(e.target.value)}
                      placeholder="llama3, mistral, or phi3"
                      className="text-xs h-8"
                    />
                    {status.models.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[11px] text-muted-foreground mr-1">Detected:</span>
                        {status.models.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModelInput(m)}
                            className="text-[10px] bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded border"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="system-prompt" className="text-xs">Coach Persona / System Prompt</Label>
                    <Textarea
                      id="system-prompt"
                      value={systemPromptInput}
                      onChange={(e) => setSystemPromptInput(e.target.value)}
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>
                  <Button onClick={handleSaveSettings} size="sm" className="w-full">
                    Save AI Settings
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={refreshStatus}
              disabled={checking}
              title="Refresh connection"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 space-y-3">
          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full bg-background"
              onClick={() => handleQuickPrompt("analyze")}
              disabled={generating}
            >
              <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
              Analyze Habits
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full bg-background"
              onClick={() => handleQuickPrompt("stack")}
              disabled={generating}
            >
              Habit Stacking Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full bg-background"
              onClick={() => handleQuickPrompt("motivation")}
              disabled={generating}
            >
              Stoic Boost
            </Button>
          </div>

          {/* Prompt Input */}
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask your coach anything about habits, discipline, routines..."
              className="text-xs h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={generating}
            />
            <Button
              size="sm"
              className="h-9 px-3 shrink-0"
              onClick={() => handleSend()}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Generated Response View */}
          {response && (
            <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-2 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between text-muted-foreground pb-1 border-b text-[11px]">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  Coach Insights ({usedEngine === "ollama" ? `Ollama ${status.activeModel}` : "Built-in Local Engine"})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1 text-muted-foreground"
                  onClick={() => setResponse(null)}
                >
                  Clear
                </Button>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                {response}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
