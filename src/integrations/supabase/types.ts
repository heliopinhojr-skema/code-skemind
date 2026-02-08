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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      arena_entries: {
        Row: {
          arena_id: string
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          player_id: string
          prize_won: number
          rank: number | null
          score: number
          status: string
          time_remaining: number | null
        }
        Insert: {
          arena_id: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          player_id: string
          prize_won?: number
          rank?: number | null
          score?: number
          status?: string
          time_remaining?: number | null
        }
        Update: {
          arena_id?: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          player_id?: string
          prize_won?: number
          rank?: number | null
          score?: number
          status?: string
          time_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_entries_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arena_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_listings: {
        Row: {
          bot_count: number
          buy_in: number
          created_at: string
          creator_id: string
          id: string
          max_entries: number
          name: string
          rake_fee: number
          status: string
          total_entries: number
        }
        Insert: {
          bot_count?: number
          buy_in?: number
          created_at?: string
          creator_id: string
          id?: string
          max_entries?: number
          name: string
          rake_fee?: number
          status?: string
          total_entries?: number
        }
        Update: {
          bot_count?: number
          buy_in?: number
          created_at?: string
          creator_id?: string
          id?: string
          max_entries?: number
          name?: string
          rake_fee?: number
          status?: string
          total_entries?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_listings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_history: {
        Row: {
          attempts: number
          created_at: string
          game_mode: string
          guesses: Json | null
          id: string
          player_id: string
          race_id: string | null
          score: number
          secret_code: Json | null
          time_remaining: number | null
          won: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          game_mode?: string
          guesses?: Json | null
          id?: string
          player_id: string
          race_id?: string | null
          score?: number
          secret_code?: Json | null
          time_remaining?: number | null
          won?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          game_mode?: string
          guesses?: Json | null
          id?: string
          player_id?: string
          race_id?: string | null
          score?: number
          secret_code?: Json | null
          time_remaining?: number | null
          won?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "game_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "official_races"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          creator_id: string
          id: string
          used_at: string | null
          used_by_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          creator_id: string
          id?: string
          used_at?: string | null
          used_by_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          creator_id?: string
          id?: string
          used_at?: string | null
          used_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_id_fkey"
            columns: ["used_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      official_races: {
        Row: {
          created_at: string
          entry_fee: number
          id: string
          max_players: number
          min_players: number
          name: string
          prize_per_player: number
          scheduled_date: string
          skema_box_fee: number
          status: string
        }
        Insert: {
          created_at?: string
          entry_fee?: number
          id?: string
          max_players?: number
          min_players?: number
          name: string
          prize_per_player?: number
          scheduled_date: string
          skema_box_fee?: number
          status?: string
        }
        Update: {
          created_at?: string
          entry_fee?: number
          id?: string
          max_players?: number
          min_players?: number
          name?: string
          prize_per_player?: number
          scheduled_date?: string
          skema_box_fee?: number
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          emoji: string
          energy: number
          id: string
          invite_code: string
          invited_by: string | null
          invited_by_name: string | null
          last_refill_date: string | null
          name: string
          pin: string | null
          player_tier: string | null
          stats_best_time: number | null
          stats_races: number
          stats_wins: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          energy?: number
          id?: string
          invite_code: string
          invited_by?: string | null
          invited_by_name?: string | null
          last_refill_date?: string | null
          name: string
          pin?: string | null
          player_tier?: string | null
          stats_best_time?: number | null
          stats_races?: number
          stats_wins?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          energy?: number
          id?: string
          invite_code?: string
          invited_by?: string | null
          invited_by_name?: string | null
          last_refill_date?: string | null
          name?: string
          pin?: string | null
          player_tier?: string | null
          stats_best_time?: number | null
          stats_races?: number
          stats_wins?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      race_registrations: {
        Row: {
          id: string
          player_id: string
          race_id: string
          registered_at: string
        }
        Insert: {
          id?: string
          player_id: string
          race_id: string
          registered_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          race_id?: string
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_registrations_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "official_races"
            referencedColumns: ["id"]
          },
        ]
      }
      race_results: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          player_id: string
          race_id: string
          score: number
          status: string
          time_remaining: number | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          player_id: string
          race_id: string
          score?: number
          status?: string
          time_remaining?: number | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          player_id?: string
          race_id?: string
          score?: number
          status?: string
          time_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "race_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "official_races"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          invited_id: string
          inviter_id: string
          reward_amount: number | null
          reward_credited: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          invited_id: string
          inviter_id: string
          reward_amount?: number | null
          reward_credited?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          invited_id?: string
          inviter_id?: string
          reward_amount?: number | null
          reward_credited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "referrals_invited_id_fkey"
            columns: ["invited_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skema_box: {
        Row: {
          balance: number
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      skema_box_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_player_energy: {
        Args: { p_new_energy: number; p_player_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_set_player_status: {
        Args: { p_player_id: string; p_status: string }
        Returns: undefined
      }
      generate_invite_code: {
        Args: { p_creator_profile_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      register_player: {
        Args: { p_emoji: string; p_invite_code: string; p_name: string }
        Returns: undefined
      }
      set_user_role_and_tier: {
        Args: {
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_new_tier: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      update_player_energy: {
        Args: { p_amount: number; p_player_id: string }
        Returns: undefined
      }
      update_skema_box: {
        Args: { p_amount: number; p_description?: string; p_type: string }
        Returns: number
      }
      validate_invite_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "master_admin"
        | "guardiao"
        | "grao_mestre"
        | "mestre"
        | "jogador"
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
    Enums: {
      app_role: [
        "master_admin",
        "guardiao",
        "grao_mestre",
        "mestre",
        "jogador",
      ],
    },
  },
} as const
