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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      kitchen_permissions: {
        Row: {
          can_confirm_payment: boolean
          can_manage_menu: boolean
          can_open_close_shift: boolean
          can_update_order_status: boolean
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_confirm_payment?: boolean
          can_manage_menu?: boolean
          can_open_close_shift?: boolean
          can_update_order_status?: boolean
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_confirm_payment?: boolean
          can_manage_menu?: boolean
          can_open_close_shift?: boolean
          can_update_order_status?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          available_dinner: boolean
          available_lunch: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          available_dinner?: boolean
          available_lunch?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available_dinner?: boolean
          available_lunch?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          created_at: string
          fee: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          extras: Json | null
          id: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          created_at?: string
          extras?: Json | null
          id?: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Update: {
          created_at?: string
          extras?: Json | null
          id?: string
          menu_item_id?: string
          name?: string
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          change_for: number | null
          confirmed_payment_method: string | null
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_type: string
          id: string
          neighborhood: string | null
          notes: string | null
          order_number: number
          payment_confirmed_at: string | null
          payment_method: string | null
          shift_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          change_for?: number | null
          confirmed_payment_method?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          delivery_type: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          order_number?: number
          payment_confirmed_at?: string | null
          payment_method?: string | null
          shift_id?: string | null
          status?: string
          subtotal?: number
          total: number
          updated_at?: string
        }
        Update: {
          change_for?: number | null
          confirmed_payment_method?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          delivery_type?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          order_number?: number
          payment_confirmed_at?: string | null
          payment_method?: string | null
          shift_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_settings: {
        Row: {
          avg_prep_minutes: number
          dinner_end: string
          dinner_start: string
          id: number
          lunch_end: string
          lunch_start: string
          min_order_value: number
          updated_at: string
        }
        Insert: {
          avg_prep_minutes?: number
          dinner_end?: string
          dinner_start?: string
          id?: number
          lunch_end?: string
          lunch_start?: string
          min_order_value?: number
          updated_at?: string
        }
        Update: {
          avg_prep_minutes?: number
          dinner_end?: string
          dinner_start?: string
          id?: number
          lunch_end?: string
          lunch_start?: string
          min_order_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          location: string
          people_count: number
          phone: string
          reservation_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          location: string
          people_count: number
          phone: string
          reservation_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          location?: string
          people_count?: number
          phone?: string
          reservation_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
        }
        Relationships: []
      }
      shifts: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          opened_at: string
          opening_cash: number
          operator_id: string | null
          operator_name: string | null
          shift_type: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          opening_cash?: number
          operator_id?: string | null
          operator_name?: string | null
          shift_type: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          opening_cash?: number
          operator_id?: string | null
          operator_name?: string | null
          shift_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          avg_prep_minutes: number
          dinner_end: string
          dinner_start: string
          id: number
          lunch_end: string
          lunch_start: string
          min_order_value: number
          printer_url: string
          report_emails: string[]
          updated_at: string
        }
        Insert: {
          avg_prep_minutes?: number
          dinner_end?: string
          dinner_start?: string
          id?: number
          lunch_end?: string
          lunch_start?: string
          min_order_value?: number
          printer_url?: string
          report_emails?: string[]
          updated_at?: string
        }
        Update: {
          avg_prep_minutes?: number
          dinner_end?: string
          dinner_start?: string
          id?: number
          lunch_end?: string
          lunch_start?: string
          min_order_value?: number
          printer_url?: string
          report_emails?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      claim_admin_if_whitelisted: { Args: never; Returns: boolean }
      claim_role_if_whitelisted: { Args: never; Returns: string }
      get_active_shift_id: { Args: never; Returns: string }
      get_next_order_number: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator"
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
      app_role: ["admin", "operator"],
    },
  },
} as const
