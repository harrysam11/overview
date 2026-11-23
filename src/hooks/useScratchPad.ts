import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getScratchPadStore } from "@/lib/data/scratchPadStore";

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
      const store = await getScratchPadStore();
      const text = await store.getNotes();
      setContent(text);
    } catch (error) {
      console.error("Failed to load scratch pad:", error);
    } finally {
      setLoading(false);
    }
  };

  const save = useCallback(async (newContent: string) => {
    setSaving(true);
    try {
      const store = await getScratchPadStore();
      await store.saveNotes(newContent);
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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { content, updateContent, loading, saving };
};
