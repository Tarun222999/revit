export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      journal_entries: {
        Row: {
          completed_on: string | null
          contains_spoilers: boolean
          created_at: string
          effective_status: string
          has_active_plan: boolean
          id: string
          last_activity_at: string
          legacy_bridge_statement_at: string | null
          legacy_plan_resolution_statement_at: string | null
          media_item_id: string
          planned_for: string | null
          rating: number | null
          review_body: string | null
          review_headline: string | null
          started_on: string | null
          status: string
          updated_at: string
          undated_completed_count: number
          user_id: string
        }
        Insert: {
          completed_on?: string | null
          contains_spoilers?: boolean
          created_at?: string
          effective_status?: string
          has_active_plan?: boolean
          id?: string
          last_activity_at?: string
          legacy_bridge_statement_at?: string | null
          legacy_plan_resolution_statement_at?: string | null
          media_item_id: string
          planned_for?: string | null
          rating?: number | null
          review_body?: string | null
          review_headline?: string | null
          started_on?: string | null
          status: string
          updated_at?: string
          undated_completed_count?: number
          user_id: string
        }
        Update: {
          completed_on?: string | null
          contains_spoilers?: boolean
          created_at?: string
          effective_status?: string
          has_active_plan?: boolean
          id?: string
          last_activity_at?: string
          legacy_bridge_statement_at?: string | null
          legacy_plan_resolution_statement_at?: string | null
          media_item_id?: string
          planned_for?: string | null
          rating?: number | null
          review_body?: string | null
          review_headline?: string | null
          started_on?: string | null
          status?: string
          updated_at?: string
          undated_completed_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          is_legacy_mirror: boolean
          journal_entry_id: string
          legacy_bridge_statement_at: string | null
          notes: string | null
          operation_id: string | null
          played_on_platform: string | null
          rating: number | null
          resolved_active_plan: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          is_legacy_mirror?: boolean
          journal_entry_id: string
          legacy_bridge_statement_at?: string | null
          notes?: string | null
          operation_id?: string | null
          played_on_platform?: string | null
          rating?: number | null
          resolved_active_plan?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          is_legacy_mirror?: boolean
          journal_entry_id?: string
          legacy_bridge_statement_at?: string | null
          notes?: string | null
          operation_id?: string | null
          played_on_platform?: string | null
          rating?: number | null
          resolved_active_plan?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_events_entry_owner_fkey"
            columns: ["journal_entry_id", "user_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      list_items: {
        Row: {
          created_at: string
          id: string
          list_id: string
          media_item_id: string
          note: string | null
          position: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          media_item_id: string
          note?: string | null
          position?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          media_item_id?: string
          note?: string | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_discovery_cache: {
        Row: {
          cached_at: string
          expires_at: string
          media_type: string
          mode: string
          page: number
          response: Json
        }
        Insert: {
          cached_at?: string
          expires_at: string
          media_type: string
          mode: string
          page: number
          response: Json
        }
        Update: {
          cached_at?: string
          expires_at?: string
          media_type?: string
          mode?: string
          page?: number
          response?: Json
        }
        Relationships: []
      }
      media_items: {
        Row: {
          backdrop_url: string | null
          created_at: string
          description: string | null
          genres: Json
          id: string
          image_url: string | null
          media_type: string
          metadata: Json
          original_title: string | null
          release_date: string | null
          source: string
          source_id: string
          title: string
          updated_at: string
        }
        Insert: {
          backdrop_url?: string | null
          created_at?: string
          description?: string | null
          genres?: Json
          id?: string
          image_url?: string | null
          media_type: string
          metadata?: Json
          original_title?: string | null
          release_date?: string | null
          source: string
          source_id: string
          title: string
          updated_at?: string
        }
        Update: {
          backdrop_url?: string | null
          created_at?: string
          description?: string | null
          genres?: Json
          id?: string
          image_url?: string | null
          media_type?: string
          metadata?: Json
          original_title?: string | null
          release_date?: string | null
          source?: string
          source_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      journal_get_completion_origins: {
        Args: { p_journal_entry_ids: string[] }
        Returns: {
          first_completed_event_id: string | null
          has_undated_completion: boolean
          journal_entry_id: string
        }[]
      }
      journal_delete_event: {
        Args: {
          p_empty_title_action?: string | null
          p_event_id: string
        }
        Returns: Json
      }
      journal_log_event: {
        Args: {
          p_event_date: string
          p_event_type: string
          p_media_item_id: string
          p_notes: string | null
          p_rating: number | null
          p_request_id: string
          p_resolve_active_plan: boolean
          p_today: string
        }
        Returns: Json
      }
      journal_log_game_event: {
        Args: {
          p_event_date: string
          p_event_type: string
          p_media_item_id: string
          p_notes: string | null
          p_played_on_platform?: string | null
          p_rating: number | null
          p_request_id: string
          p_resolve_active_plan: boolean
          p_today: string
        }
        Returns: Json
      }
      journal_remove_plan: {
        Args: { p_journal_entry_id: string }
        Returns: Json
      }
      journal_remove_title: {
        Args: { p_journal_entry_id: string }
        Returns: Json
      }
      journal_save_plan: {
        Args: {
          p_media_item_id: string
          p_planned_for: string | null
          p_today: string
        }
        Returns: Json
      }
      journal_server_delete_game_event: {
        Args: {
          p_empty_title_action?: string | null
          p_event_id: string
          p_user_id: string
        }
        Returns: Json
      }
      journal_server_log_game_event: {
        Args: {
          p_event_date: string
          p_event_type: string
          p_media_item_id: string
          p_notes: string | null
          p_played_on_platform?: string | null
          p_rating: number | null
          p_request_id: string
          p_resolve_active_plan: boolean
          p_today: string
          p_user_id: string
        }
        Returns: Json
      }
      journal_server_save_game_plan: {
        Args: {
          p_media_item_id: string
          p_planned_for: string | null
          p_today: string
          p_user_id: string
        }
        Returns: Json
      }
      journal_server_update_game_event: {
        Args: {
          p_event_date: string
          p_event_id: string
          p_notes: string | null
          p_played_on_platform?: string | null
          p_rating: number | null
          p_today: string
          p_user_id: string
        }
        Returns: Json
      }
      journal_update_event: {
        Args: {
          p_event_date: string
          p_event_id: string
          p_notes: string | null
          p_rating: number | null
          p_today: string
        }
        Returns: Json
      }
      journal_update_game_event: {
        Args: {
          p_event_date: string
          p_event_id: string
          p_notes: string | null
          p_played_on_platform?: string | null
          p_rating: number | null
          p_today: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
