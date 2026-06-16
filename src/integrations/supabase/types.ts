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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      battle_challenges: {
        Row: {
          challenged_id: string
          challenged_pet_id: string | null
          challenger_id: string
          challenger_pet_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          status: string
          wager_amount: number | null
        }
        Insert: {
          challenged_id: string
          challenged_pet_id?: string | null
          challenger_id: string
          challenger_pet_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          wager_amount?: number | null
        }
        Update: {
          challenged_id?: string
          challenged_pet_id?: string | null
          challenger_id?: string
          challenger_pet_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          wager_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_challenges_challenged_pet_id_fkey"
            columns: ["challenged_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_challenges_challenger_pet_id_fkey"
            columns: ["challenger_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_turns: {
        Row: {
          action_type: string
          actor_type: string
          attacker_hp: number
          battle_id: string
          created_at: string | null
          damage_dealt: number | null
          defender_hp: number
          id: string
          item_used: string | null
          skill_used: string | null
          turn_number: number
        }
        Insert: {
          action_type: string
          actor_type: string
          attacker_hp: number
          battle_id: string
          created_at?: string | null
          damage_dealt?: number | null
          defender_hp: number
          id?: string
          item_used?: string | null
          skill_used?: string | null
          turn_number: number
        }
        Update: {
          action_type?: string
          actor_type?: string
          attacker_hp?: number
          battle_id?: string
          created_at?: string | null
          damage_dealt?: number | null
          defender_hp?: number
          id?: string
          item_used?: string | null
          skill_used?: string | null
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_turns_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          attacker_damage_dealt: number
          attacker_id: string
          attacker_pet_id: string
          completed_at: string | null
          created_at: string
          defender_damage_dealt: number
          defender_id: string | null
          defender_pet_id: string
          id: string
          is_ai_battle: boolean
          rewards_experience: number
          rewards_petpoints: number
          status: string
          winner_id: string | null
        }
        Insert: {
          attacker_damage_dealt?: number
          attacker_id: string
          attacker_pet_id: string
          completed_at?: string | null
          created_at?: string
          defender_damage_dealt?: number
          defender_id?: string | null
          defender_pet_id: string
          id?: string
          is_ai_battle?: boolean
          rewards_experience?: number
          rewards_petpoints?: number
          status?: string
          winner_id?: string | null
        }
        Update: {
          attacker_damage_dealt?: number
          attacker_id?: string
          attacker_pet_id?: string
          completed_at?: string | null
          created_at?: string
          defender_damage_dealt?: number
          defender_id?: string | null
          defender_pet_id?: string
          id?: string
          is_ai_battle?: boolean
          rewards_experience?: number
          rewards_petpoints?: number
          status?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          created_at: string | null
          description: string
          id: string
          quest_type: Database["public"]["Enums"]["quest_type"]
          reward_experience: number
          reward_petpoints: number
          target_count: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          quest_type: Database["public"]["Enums"]["quest_type"]
          reward_experience?: number
          reward_petpoints?: number
          target_count?: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          quest_type?: Database["public"]["Enums"]["quest_type"]
          reward_experience?: number
          reward_petpoints?: number
          target_count?: number
          title?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string | null
          equipped: boolean | null
          id: string
          item_id: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equipped?: boolean | null
          id?: string
          item_id: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          equipped?: boolean | null
          id?: string
          item_id?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          created_at: string | null
          id: string
          listed_at: string | null
          pet_id: string
          price: number
          seller_id: string
          sold_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listed_at?: string | null
          pet_id: string
          price: number
          seller_id: string
          sold_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listed_at?: string | null
          pet_id?: string
          price?: number
          seller_id?: string
          sold_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      pet_transfers: {
        Row: {
          created_at: string | null
          from_user_id: string | null
          id: string
          marketplace_listing_id: string | null
          pet_id: string
          price: number | null
          to_user_id: string
          trade_offer_id: string | null
          transfer_type: string
        }
        Insert: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          marketplace_listing_id?: string | null
          pet_id: string
          price?: number | null
          to_user_id: string
          trade_offer_id?: string | null
          transfer_type: string
        }
        Update: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          marketplace_listing_id?: string | null
          pet_id?: string
          price?: number | null
          to_user_id?: string
          trade_offer_id?: string | null
          transfer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_transfers_marketplace_listing_id_fkey"
            columns: ["marketplace_listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_transfers_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_transfers_trade_offer_id_fkey"
            columns: ["trade_offer_id"]
            isOneToOne: false
            referencedRelation: "trade_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          color: string
          created_at: string | null
          element: string
          energy: number | null
          experience: number | null
          happiness: number | null
          health: number | null
          hunger: number | null
          id: string
          last_fed_at: string | null
          last_groomed_at: string | null
          last_played_at: string | null
          last_rested_at: string | null
          level: number | null
          name: string
          owner_id: string
          skills: Json | null
          species: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          element?: string
          energy?: number | null
          experience?: number | null
          happiness?: number | null
          health?: number | null
          hunger?: number | null
          id?: string
          last_fed_at?: string | null
          last_groomed_at?: string | null
          last_played_at?: string | null
          last_rested_at?: string | null
          level?: number | null
          name: string
          owner_id: string
          skills?: Json | null
          species: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          element?: string
          energy?: number | null
          experience?: number | null
          happiness?: number | null
          health?: number | null
          hunger?: number | null
          id?: string
          last_fed_at?: string | null
          last_groomed_at?: string | null
          last_played_at?: string | null
          last_rested_at?: string | null
          level?: number | null
          name?: string
          owner_id?: string
          skills?: Json | null
          species?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          max_pets: number
          pet_points: number | null
          updated_at: string | null
          username: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          max_pets?: number
          pet_points?: number | null
          updated_at?: string | null
          username: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_pets?: number
          pet_points?: number | null
          updated_at?: string | null
          username?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          effect_type: string | null
          effect_value: number | null
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          effect_type?: string | null
          effect_value?: number | null
          id?: string
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          effect_type?: string | null
          effect_value?: number | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      species_catalog: {
        Row: {
          base_stats: Json | null
          created_at: string | null
          description: string
          display_name: string
          element: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          rarity: string | null
          unlock_level: number | null
          updated_at: string | null
        }
        Insert: {
          base_stats?: Json | null
          created_at?: string | null
          description: string
          display_name: string
          element: string
          id: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          rarity?: string | null
          unlock_level?: number | null
          updated_at?: string | null
        }
        Update: {
          base_stats?: Json | null
          created_at?: string | null
          description?: string
          display_name?: string
          element?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          rarity?: string | null
          unlock_level?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_offers: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          offerer_id: string
          offerer_pet_id: string
          recipient_id: string
          recipient_pet_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          offerer_id: string
          offerer_pet_id: string
          recipient_id: string
          recipient_pet_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          offerer_id?: string
          offerer_pet_id?: string
          recipient_id?: string
          recipient_pet_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_offers_offerer_pet_id_fkey"
            columns: ["offerer_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_recipient_pet_id_fkey"
            columns: ["recipient_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_progress: {
        Row: {
          assigned_at: string
          claimed_at: string | null
          completed_at: string | null
          created_at: string | null
          current_count: number
          id: string
          quest_id: string
          status: Database["public"]["Enums"]["quest_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number
          id?: string
          quest_id: string
          status?: Database["public"]["Enums"]["quest_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number
          id?: string
          quest_id?: string
          status?: Database["public"]["Enums"]["quest_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "daily_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          id: string | null
          pet_points: number | null
          rank: number | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_battle_challenge: {
        Args: { p_challenge_id: string; p_challenged_pet_id: string }
        Returns: Json
      }
      accept_trade_offer: {
        Args: { p_offer_id: string; p_recipient_id: string }
        Returns: Json
      }
      assign_daily_quests_to_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      claim_quest_reward: {
        Args: {
          p_quest_progress_id: string
          p_reward_points: number
          p_user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_pet_on_marketplace: {
        Args: { p_pet_id: string; p_price: number; p_user_id: string }
        Returns: Json
      }
      purchase_marketplace_pet: {
        Args: { p_buyer_id: string; p_listing_id: string }
        Returns: Json
      }
      purchase_shop_item: {
        Args: { p_item_id: string; p_item_price: number; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      quest_status: "active" | "completed" | "claimed"
      quest_type: "pet_care" | "battle" | "challenge"
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
      app_role: ["admin", "moderator", "user"],
      quest_status: ["active", "completed", "claimed"],
      quest_type: ["pet_care", "battle", "challenge"],
    },
  },
} as const
