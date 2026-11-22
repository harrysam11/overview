import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { messageContentSchema } from "@/lib/validation";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_profile?: { display_name: string | null; avatar_url: string | null };
}

export interface ChatConversation {
  friendId: string;
  friendName: string | null;
  friendAvatar: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
}

export const useChat = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all messages involving the user
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by friend and get latest message
      const conversationMap = new Map<string, {
        lastMessage: string;
        lastMessageTime: string;
        unreadCount: number;
      }>();

      (messages || []).forEach(msg => {
        const friendId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationMap.has(friendId)) {
          conversationMap.set(friendId, {
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: msg.receiver_id === user.id && !msg.read ? 1 : 0,
          });
        } else {
          const existing = conversationMap.get(friendId)!;
          if (msg.receiver_id === user.id && !msg.read) {
            existing.unreadCount++;
          }
        }
      });

      // Get friend profiles
      const friendIds = Array.from(conversationMap.keys());
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", friendIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const convos: ChatConversation[] = friendIds.map(friendId => {
          const profile = profileMap.get(friendId);
          const conv = conversationMap.get(friendId)!;
          return {
            friendId,
            friendName: profile?.display_name || null,
            friendAvatar: profile?.avatar_url || null,
            lastMessage: conv.lastMessage,
            lastMessageTime: conv.lastMessageTime,
            unreadCount: conv.unreadCount,
          };
        });

        setConversations(convos.sort((a, b) => 
          new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
        ));
      } else {
        setConversations([]);
      }
    } catch (error: any) {
      toast({
        description: "Failed to load conversations",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadMessages = useCallback(async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", friendId)
        .eq("receiver_id", user.id)
        .eq("read", false);

      // Get sender profiles
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const withProfiles = (messages || []).map(m => ({
        ...m,
        sender_profile: profileMap.get(m.sender_id),
      }));

      setCurrentMessages(withProfiles);
    } catch (error: any) {
      toast({
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  }, [toast]);

  const sendMessage = async (receiverId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate message content
      const result = messageContentSchema.safeParse(content);
      if (!result.success) {
        toast({
          description: result.error.issues[0]?.message || "Invalid message",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: result.data,
        });

      if (error) throw error;
      
      // Reload messages
      await loadMessages(receiverId);
      await loadConversations();
    } catch (error: any) {
      toast({
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadConversations();
      setLoading(false);
    };
    init();
  }, [loadConversations]);

  // Subscribe to real-time messages
  useEffect(() => {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  return {
    conversations,
    currentMessages,
    loading,
    loadMessages,
    sendMessage,
    refresh: loadConversations,
  };
};
