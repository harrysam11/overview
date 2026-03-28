import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useScratchPad = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadScratchPad();
  }, []);

  const loadScratchPad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("scratch_pad")
        .select("content")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setContent(data?.content || "");
    } catch (error) {
      console.error("Failed to load scratch pad:", error);
    } finally {
      setLoading(false);
    }
  };

  const save = useCallback(async (newContent: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("scratch_pad")
        .upsert(
          { user_id: user.id, content: newContent },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    } catch (error) {
      toast({
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    
    // Debounced auto-save (1.5s after last keystroke)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      save(newContent);
    }, 1500);
  }, [save]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { content, updateContent, loading, saving };
};
