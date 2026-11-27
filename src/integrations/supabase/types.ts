export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      app_shortcuts: {
        Row: {
          created_at: string
          favicon_url: string | null
          id: string
          name: string
          sort_order: number
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favicon_url?: string | null
          id?: string
          name: string
          sort_order?: number
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          favicon_url?: string | null
          id?: string
          name?: string
          sort_order?: number
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon: string
          id: string
          name: string
          rarity?: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      challenge_invites: {
        Row: {
          challenge_id: string
          created_at: string
          from_user_id: string
          id: string
          status: Database["public"]["Enums"]["request_status"]
          to_user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          from_user_id: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          to_user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_invites_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          end_date: string
          goal_type: Database["public"]["Enums"]["challenge_goal_type"]
          goal_value: number
          id: string
          is_public: boolean
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          end_date: string
          goal_type: Database["public"]["Enums"]["challenge_goal_type"]
          goal_value: number
          id?: string
          is_public?: boolean
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          end_date?: string
          goal_type?: Database["public"]["Enums"]["challenge_goal_type"]
          goal_value?: number
          id?: string
          is_public?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      daily_records: {
        Row: {
          completed: boolean
          created_at: string
          habit_id: string
          id: string
          record_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          habit_id: string
          id?: string
          record_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          habit_id?: string
          id?: string
          record_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_records_user_id_habit_id_fkey"
            columns: ["user_id", "habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          content: Json
          created_at: string
          entry_date: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          entry_date: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          entry_date?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diary_entry_habits: {
        Row: {
          created_at: string
          diary_entry_id: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diary_entry_id: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diary_entry_id?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entry_habits_user_id_diary_entry_id_fkey"
            columns: ["user_id", "diary_entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "diary_entry_habits_user_id_habit_id_fkey"
            columns: ["user_id", "habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: Database["public"]["Enums"]["request_status"]
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      habit_workspace_items: {
        Row: {
          created_at: string
          file_path: string | null
          file_size: number | null
          habit_id: string
          id: string
          item_type: string
          mime_type: string | null
          sort_order: number
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          habit_id: string
          id?: string
          item_type: string
          mime_type?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          habit_id?: string
          id?: string
          item_type?: string
          mime_type?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_workspace_items_user_id_habit_id_fkey"
            columns: ["user_id", "habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idea_cards: {
        Row: {
          category_id: string
          content: string | null
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          content?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          content?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_cards_user_id_category_id_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "idea_categories"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      idea_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          entry_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          entry_date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      level_definitions: {
        Row: {
          icon: string
          level: number
          min_xp: number
          title: string
        }
        Insert: {
          icon: string
          level: number
          min_xp: number
          title: string
        }
        Update: {
          icon?: string
          level?: number
          min_xp?: number
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          is_completed: boolean
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_user_id_goal_id_fkey"
            columns: ["user_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          enabled: boolean
          reminder_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_searchable: boolean
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_searchable?: boolean
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_searchable?: boolean
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      scratch_pad: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          priority: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          priority?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          priority?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      notification_subscriptions_safe: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      award_badge_if_earned: {
        Args: { p_badge_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_challenge: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          _action_type: string
          _max_requests: number
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      get_user_subscription_info: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          endpoint: string
          id: string
        }[]
      }
      has_push_subscription: {
        Args: { _endpoint?: string; _user_id: string }
        Returns: boolean
      }
      increment_xp: { Args: { p_amount: number }; Returns: number }
      is_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      join_group_as_creator: { Args: { p_group_id: string }; Returns: boolean }
      update_challenge_progress: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      challenge_goal_type: "points" | "streak_days" | "habits_completed"
      request_status: "pending" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      challenge_goal_type: ["points", "streak_days", "habits_completed"],
      request_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
