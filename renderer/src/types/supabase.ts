export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      challenges: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string | null
          description: string
          id: string
          keyboard: string
          level: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          keyboard: string
          level: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          keyboard?: string
          level?: string
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          channel_uri: string | null
          created_at: string
          device_name: string | null
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_uri?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_uri?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string
          complete: boolean | null
          created_at: string | null
          description: string
          id: string
          keyboard: string
          language: string
          level: string
          requirement: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          complete?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          keyboard: string
          language: string
          level: string
          requirement?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          complete?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          keyboard?: string
          language?: string
          level?: string
          requirement?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_scores: {
        Row: {
          capital: boolean | null
          correct: number
          cpm: number
          created_at: string | null
          datetime: string
          id: string
          incorrect: number
          keyboard: string
          language: string | null
          level: string
          numbers: boolean | null
          punctuation: boolean | null
          time: number
          user_id: string
          username: string
        }
        Insert: {
          capital?: boolean | null
          correct: number
          cpm: number
          created_at?: string | null
          datetime?: string
          id?: string
          incorrect: number
          keyboard: string
          language?: string | null
          level: string
          numbers?: boolean | null
          punctuation?: boolean | null
          time: number
          user_id: string
          username: string
        }
        Update: {
          capital?: boolean | null
          correct?: number
          cpm?: number
          created_at?: string | null
          datetime?: string
          id?: string
          incorrect?: number
          keyboard?: string
          language?: string | null
          level?: string
          numbers?: boolean | null
          punctuation?: boolean | null
          time?: number
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone_number: string | null
          preferred_username: string | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          phone_number?: string | null
          preferred_username?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone_number?: string | null
          preferred_username?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pvp_games: {
        Row: {
          capital: boolean
          created_at: string
          creator_completed_at: string | null
          creator_correct: number | null
          creator_cpm: number | null
          creator_id: string
          creator_incorrect: number | null
          creator_key_presses: Json | null
          creator_time: string | null
          expires_at: string
          id: string
          invite_code: string
          joiner_completed_at: string | null
          joiner_correct: number | null
          joiner_cpm: number | null
          joiner_id: string | null
          joiner_incorrect: number | null
          joiner_joined_at: string | null
          joiner_key_presses: Json | null
          joiner_time: string | null
          keyboard: string
          language: string
          level: string
          message: string | null
          numbers: boolean
          punctuation: boolean
          status: string
          updated_at: string
          winner_id: string | null
          word_set: string[]
        }
        Insert: {
          capital?: boolean
          created_at?: string
          creator_completed_at?: string | null
          creator_correct?: number | null
          creator_cpm?: number | null
          creator_id: string
          creator_incorrect?: number | null
          creator_key_presses?: Json | null
          creator_time?: string | null
          expires_at?: string
          id?: string
          invite_code: string
          joiner_completed_at?: string | null
          joiner_correct?: number | null
          joiner_cpm?: number | null
          joiner_id?: string | null
          joiner_incorrect?: number | null
          joiner_joined_at?: string | null
          joiner_key_presses?: Json | null
          joiner_time?: string | null
          keyboard: string
          language: string
          level: string
          message?: string | null
          numbers?: boolean
          punctuation?: boolean
          status?: string
          updated_at?: string
          winner_id?: string | null
          word_set: string[]
        }
        Update: {
          capital?: boolean
          created_at?: string
          creator_completed_at?: string | null
          creator_correct?: number | null
          creator_cpm?: number | null
          creator_id?: string
          creator_incorrect?: number | null
          creator_key_presses?: Json | null
          creator_time?: string | null
          expires_at?: string
          id?: string
          invite_code?: string
          joiner_completed_at?: string | null
          joiner_correct?: number | null
          joiner_cpm?: number | null
          joiner_id?: string | null
          joiner_incorrect?: number | null
          joiner_joined_at?: string | null
          joiner_key_presses?: Json | null
          joiner_time?: string | null
          keyboard?: string
          language?: string
          level?: string
          message?: string | null
          numbers?: boolean
          punctuation?: boolean
          status?: string
          updated_at?: string
          winner_id?: string | null
          word_set?: string[]
        }
        Relationships: []
      }
      results: {
        Row: {
          capital: boolean | null
          correct: number
          cpm: number
          created_at: string | null
          datetime: string
          id: string
          incorrect: number
          key_presses: Json | null
          keyboard: string
          language: string
          level: string
          numbers: boolean | null
          punctuation: boolean | null
          time: string
          user_id: string
        }
        Insert: {
          capital?: boolean | null
          correct: number
          cpm: number
          created_at?: string | null
          datetime?: string
          id?: string
          incorrect: number
          key_presses?: Json | null
          keyboard: string
          language: string
          level: string
          numbers?: boolean | null
          punctuation?: boolean | null
          time: string
          user_id: string
        }
        Update: {
          capital?: boolean | null
          correct?: number
          cpm?: number
          created_at?: string | null
          datetime?: string
          id?: string
          incorrect?: number
          key_presses?: Json | null
          keyboard?: string
          language?: string
          level?: string
          numbers?: boolean | null
          punctuation?: boolean | null
          time?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          analytics: boolean | null
          blinker: boolean | null
          capital: boolean | null
          created_at: string | null
          id: string
          keyboard_name: string | null
          language: string | null
          level_name: string | null
          notification_days: string[] | null
          notification_message: string | null
          notification_time: string | null
          notifications_enabled: boolean | null
          numbers: boolean | null
          practice_duration: number | null
          publish_to_leaderboard: boolean | null
          punctuation: boolean | null
          schedule_enabled: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
          whats_new_on_startup: boolean | null
        }
        Insert: {
          analytics?: boolean | null
          blinker?: boolean | null
          capital?: boolean | null
          created_at?: string | null
          id?: string
          keyboard_name?: string | null
          language?: string | null
          level_name?: string | null
          notification_days?: string[] | null
          notification_message?: string | null
          notification_time?: string | null
          notifications_enabled?: boolean | null
          numbers?: boolean | null
          practice_duration?: number | null
          publish_to_leaderboard?: boolean | null
          punctuation?: boolean | null
          schedule_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          whats_new_on_startup?: boolean | null
        }
        Update: {
          analytics?: boolean | null
          blinker?: boolean | null
          capital?: boolean | null
          created_at?: string | null
          id?: string
          keyboard_name?: string | null
          language?: string | null
          level_name?: string | null
          notification_days?: string[] | null
          notification_message?: string | null
          notification_time?: string | null
          notifications_enabled?: boolean | null
          numbers?: boolean | null
          practice_duration?: number | null
          publish_to_leaderboard?: boolean | null
          punctuation?: boolean | null
          schedule_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          whats_new_on_startup?: boolean | null
        }
        Relationships: []
      }
      streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          last_freeze_refresh: string | null
          longest_streak: number | null
          streak_freeze_count: number | null
          streak_freeze_used_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          last_freeze_refresh?: string | null
          longest_streak?: number | null
          streak_freeze_count?: number | null
          streak_freeze_used_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          last_freeze_refresh?: string | null
          longest_streak?: number | null
          streak_freeze_count?: number | null
          streak_freeze_used_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          apple_original_transaction_id: string | null
          auto_renew: boolean | null
          billing_period: string | null
          billing_plan: string | null
          billing_service: string | null
          created_at: string | null
          id: string
          next_billing_date: string | null
          payment_status: string | null
          session_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apple_original_transaction_id?: string | null
          auto_renew?: boolean | null
          billing_period?: string | null
          billing_plan?: string | null
          billing_service?: string | null
          created_at?: string | null
          id?: string
          next_billing_date?: string | null
          payment_status?: string | null
          session_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apple_original_transaction_id?: string | null
          auto_renew?: boolean | null
          billing_period?: string | null
          billing_plan?: string | null
          billing_service?: string | null
          created_at?: string | null
          id?: string
          next_billing_date?: string | null
          payment_status?: string | null
          session_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          streak_freeze_credited: boolean | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          streak_freeze_credited?: boolean | null
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          streak_freeze_credited?: boolean | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_results_view: {
        Row: {
          capital: boolean | null
          correct: number | null
          cpm: number | null
          created_at: string | null
          datetime: string | null
          id: string | null
          incorrect: number | null
          key_presses: Json | null
          keyboard: string | null
          language: string | null
          level: string | null
          numbers: boolean | null
          punctuation: boolean | null
          time: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      get_game_by_invite_code: {
        Args: { _code: string }
        Returns: {
          capital: boolean
          created_at: string
          creator_completed_at: string | null
          creator_correct: number | null
          creator_cpm: number | null
          creator_id: string
          creator_incorrect: number | null
          creator_key_presses: Json | null
          creator_time: string | null
          expires_at: string
          id: string
          invite_code: string
          joiner_completed_at: string | null
          joiner_correct: number | null
          joiner_cpm: number | null
          joiner_id: string | null
          joiner_incorrect: number | null
          joiner_joined_at: string | null
          joiner_key_presses: Json | null
          joiner_time: string | null
          keyboard: string
          language: string
          level: string
          message: string | null
          numbers: boolean
          punctuation: boolean
          status: string
          updated_at: string
          winner_id: string | null
          word_set: string[]
        }[]
        SetofOptions: {
          from: "*"
          to: "pvp_games"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      trigger_send_notifications: { Args: never; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

