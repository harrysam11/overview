import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { LocalAiSettings } from "@/lib/local/schema";

export interface OllamaStatus {
  online: boolean;
  models: string[];
  activeModel: string;
  endpoint: string;
  error?: string;
}

export const getAiSettings = async (): Promise<LocalAiSettings> => {
  const data = await readVaultData();
  return (
    data.ai_settings || {
      endpoint: "http://127.0.0.1:11434",
      model: "llama3",
      is_enabled: true,
      system_prompt: "You are an offline personal habit coach in HabitFlow LifeOS.",
    }
  );
};

export const updateAiSettings = async (settings: Partial<LocalAiSettings>): Promise<LocalAiSettings> => {
  let updated: LocalAiSettings;
  await updateVaultData((data) => {
    updated = {
      ...(data.ai_settings || {
        endpoint: "http://127.0.0.1:11434",
        model: "llama3",
        is_enabled: true,
        system_prompt: "You are an offline personal habit coach in HabitFlow LifeOS.",
      }),
      ...settings,
    };
    return {
      ...data,
      ai_settings: updated,
    };
  });
  return updated!;
};

export const checkOllamaStatus = async (): Promise<OllamaStatus> => {
  const settings = await getAiSettings();
  const endpoint = settings.endpoint.replace(/\/+$/, "");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${endpoint}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return {
        online: false,
        models: [],
        activeModel: settings.model,
        endpoint,
        error: `Ollama returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const models: string[] = Array.isArray(data.models) ? data.models.map((m: any) => m.name || m.model) : [];

    return {
      online: true,
      models,
      activeModel: settings.model,
      endpoint,
    };
  } catch (err) {
    return {
      online: false,
      models: [],
      activeModel: settings.model,
      endpoint,
      error: "Ollama daemon not reachable at " + endpoint + ". Start with 'ollama serve'.",
    };
  }
};

export const promptLocalOllama = async (prompt: string, contextPrompt?: string): Promise<string> => {
  const settings = await getAiSettings();
  const endpoint = settings.endpoint.replace(/\/+$/, "");

  const fullSystem = contextPrompt ? `${settings.system_prompt}\n${contextPrompt}` : settings.system_prompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000); // 45s for local generation

  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: settings.model,
        prompt,
        system: fullSystem,
        stream: false,
        options: {
          temperature: 0.7,
        },
      }),
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Ollama error: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response || "No response received from local model.";
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === "AbortError") {
      throw new Error("Local model timed out. Try a lighter model like phi3, llama3:8b, or mistral.");
    }
    throw new Error(e.message || "Failed to communicate with local Ollama instance.");
  }
};
