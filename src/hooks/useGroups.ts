import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { messageContentSchema } from "@/lib/validation";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  avatar_url: string | null;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: { display_name: string | null; avatar_url: string | null };
}

export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroupMessages, setCurrentGroupMessages] = useState<GroupMessage[]>([]);
  const [currentGroupMembers, setCurrentGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadGroups = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get groups user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const groupIds = memberData?.map(m => m.group_id) || [];

      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("*")
          .in("id", groupIds)
          .order("created_at", { ascending: false });

        if (groupsError) throw groupsError;

        // Get member counts
        const groupsWithCounts = await Promise.all(
          (groupsData || []).map(async (group) => {
            const { count } = await supabase
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id);
            return { ...group, member_count: count || 0 };
          })
        );

        setGroups(groupsWithCounts);
      } else {
        setGroups([]);
      }
    } catch (error: any) {
      toast({
        description: "Failed to load groups",
        variant: "destructive",
      });
    }
  }, [toast]);

  const createGroup = async (name: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin via server-side function
      const { error: joinError } = await supabase.rpc("join_group_as_creator", {
        p_group_id: group.id,
      });
      if (joinError) throw joinError;

      toast({ title: "Group created!" });
      await loadGroups();
      return group;
    } catch (error: any) {
      toast({
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
      return null;
    }
  };

  const loadGroupMessages = useCallback(async (groupId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const withProfiles = (messages || []).map(m => ({
          ...m,
          sender_profile: profileMap.get(m.sender_id),
        }));

        setCurrentGroupMessages(withProfiles);
      } else {
        setCurrentGroupMessages([]);
      }
    } catch (error: any) {
      toast({
        description: "Failed to load group messages",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadGroupMembers = useCallback(async (groupId: string) => {
    try {
      const { data: members, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);

      if (error) throw error;

      const userIds = members?.map(m => m.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const withProfiles = (members || []).map(m => ({
          ...m,
          profile: profileMap.get(m.user_id),
        }));

        setCurrentGroupMembers(withProfiles);
      } else {
        setCurrentGroupMembers([]);
      }
    } catch (error: any) {
      toast({
        description: "Failed to load group members",
        variant: "destructive",
      });
    }
  }, [toast]);

  const sendGroupMessage = async (groupId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate message content
      const result = messageContentSchema.safeParse(content);
      if (!result.success) {
        toast({
          description: result.error.errors[0]?.message || "Invalid message",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("group_messages")
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: result.data,
        });

      if (error) throw error;
      
      await loadGroupMessages(groupId);
    } catch (error: any) {
      toast({
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const addMember = async (groupId: string, userId: string) => {
    try {
      const { error } = await supabase.rpc("add_group_member", {
        p_group_id: groupId,
        p_user_id: userId,
      });

      if (error) throw error;
      toast({ title: "Member added!" });
      await loadGroupMembers(groupId);
    } catch (error: any) {
      toast({
        description: error.message || "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) throw error;
      toast({ title: "Left group" });
      await loadGroups();
    } catch (error: any) {
      toast({
        description: error.message || "Failed to leave group",
        variant: "destructive",
      });
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("creator_id", user.id);

      if (error) throw error;
      toast({ title: "Group deleted" });
      await loadGroups();
    } catch (error: any) {
      toast({
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadGroups();
      setLoading(false);
    };
    init();
  }, [loadGroups]);

  // Subscribe to real-time group messages
  useEffect(() => {
    const channel = supabase
      .channel('group-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages'
        },
        (payload) => {
          const groupId = payload.new.group_id;
          if (groupId) {
            loadGroupMessages(groupId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGroupMessages]);

  return {
    groups,
    currentGroupMessages,
    currentGroupMembers,
    loading,
    createGroup,
    loadGroupMessages,
    loadGroupMembers,
    sendGroupMessage,
    addMember,
    leaveGroup,
    deleteGroup,
    refresh: loadGroups,
  };
};
