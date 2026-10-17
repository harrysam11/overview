import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AppShortcut {
  id: string;
  user_id: string;
  name: string;
  url: string;
  favicon_url: string | null;
  created_at: string;
  sort_order: number;
}

// Function to get favicon URL from a domain
export const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // No third-party favicon lookup (privacy): validate the URL only; the UI shows a local initial.
    void urlObj;
    return null;
  } catch {
    return "";
  }
};

export const useAppShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<AppShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadShortcuts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("app_shortcuts")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setShortcuts(data || []);
    } catch (error: any) {
      toast({
        description: "Failed to load shortcuts",
        variant: "destructive",
      });
    }
  }, [toast]);

  const addShortcut = async (name: string, url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate URL
      const trimmedUrl = url.trim();
      const trimmedName = name.trim();
      
      if (!trimmedName) throw new Error("Name is required");
      if (!trimmedUrl) throw new Error("URL is required");
      
      // Add protocol if missing
      let validUrl = trimmedUrl;
      if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
        validUrl = "https://" + validUrl;
      }

      // Validate URL format
      try {
        new URL(validUrl);
      } catch {
        throw new Error("Invalid URL format");
      }

      const faviconUrl = getFaviconUrl(validUrl);
      const maxSortOrder = shortcuts.length > 0 
        ? Math.max(...shortcuts.map(s => s.sort_order)) + 1 
        : 0;

      const { error } = await supabase
        .from("app_shortcuts")
        .insert({
          user_id: user.id,
          name: trimmedName.slice(0, 100), // Limit name length
          url: validUrl.slice(0, 2000), // Limit URL length
          favicon_url: faviconUrl,
          sort_order: maxSortOrder,
        });

      if (error) throw error;
      
      toast({ title: "Shortcut added!" });
      await loadShortcuts();
    } catch (error: any) {
      toast({
        description: "Failed to add shortcut",
        variant: "destructive",
      });
    }
  };

  const removeShortcut = async (shortcutId: string) => {
    try {
      const { error } = await supabase
        .from("app_shortcuts")
        .delete()
        .eq("id", shortcutId);

      if (error) throw error;
      
      toast({ title: "Shortcut removed!" });
      await loadShortcuts();
    } catch (error: any) {
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

      const faviconUrl = getFaviconUrl(validUrl);

      const { error } = await supabase
        .from("app_shortcuts")
        .update({
          name: trimmedName.slice(0, 100),
          url: validUrl.slice(0, 2000),
          favicon_url: faviconUrl,
        })
        .eq("id", shortcutId);

      if (error) throw error;
      
      toast({ title: "Shortcut updated!" });
      await loadShortcuts();
    } catch (error: any) {
      toast({
        description: "Failed to update shortcut",
        variant: "destructive",
      });
    }
  };

  const openShortcut = (url: string) => {
    // Open in new window/tab securely
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
