import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getShortcutsStore, type AppShortcut } from "@/lib/data/shortcutsStore";

export type { AppShortcut };

// Function to get favicon URL from a domain
export const getFaviconUrl = (_url: string): string | null => {
  // No third-party favicon lookup (privacy): validate the URL only; the UI shows a local initial.
  return null;
};

export const useAppShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<AppShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadShortcuts = useCallback(async () => {
    try {
      const store = await getShortcutsStore();
      const data = await store.listShortcuts();
      setShortcuts(data);
    } catch {
      toast({
        description: "Failed to load shortcuts",
        variant: "destructive",
      });
    }
  }, [toast]);

  const addShortcut = async (name: string, url: string) => {
    try {
      const trimmedUrl = url.trim();
      const trimmedName = name.trim();

      if (!trimmedName) throw new Error("Name is required");
      if (!trimmedUrl) throw new Error("URL is required");

      let validUrl = trimmedUrl;
      if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
        validUrl = "https://" + validUrl;
      }

      try {
        new URL(validUrl);
      } catch {
        throw new Error("Invalid URL format");
      }

      const store = await getShortcutsStore();
      await store.addShortcut(trimmedName, validUrl);

      toast({ title: "Shortcut added!" });
      await loadShortcuts();
    } catch (error: any) {
      toast({
        description: error?.message || "Failed to add shortcut",
        variant: "destructive",
      });
    }
  };

  const removeShortcut = async (shortcutId: string) => {
    try {
      const store = await getShortcutsStore();
      await store.deleteShortcut(shortcutId);
      toast({ title: "Shortcut removed!" });
      await loadShortcuts();
    } catch {
      toast({
        description: "Failed to remove shortcut",
        variant: "destructive",
      });
    }
  };

  const updateShortcut = async (shortcutId: string, name: string, url: string) => {
    try {
      const trimmedUrl = url.trim();
      const trimmedName = name.trim();

      if (!trimmedName) throw new Error("Name is required");
      if (!trimmedUrl) throw new Error("URL is required");

      let validUrl = trimmedUrl;
      if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
        validUrl = "https://" + validUrl;
      }

      try {
        new URL(validUrl);
      } catch {
        throw new Error("Invalid URL format");
      }

      const store = await getShortcutsStore();
      await store.updateShortcut(shortcutId, trimmedName, validUrl);

      toast({ title: "Shortcut updated!" });
      await loadShortcuts();
    } catch (error: any) {
      toast({
        description: error?.message || "Failed to update shortcut",
        variant: "destructive",
      });
    }
  };

  const openShortcut = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadShortcuts();
      setLoading(false);
    };
    init();
  }, [loadShortcuts]);

  return {
    shortcuts,
    loading,
    addShortcut,
    removeShortcut,
    updateShortcut,
    openShortcut,
    refresh: loadShortcuts,
  };
};
