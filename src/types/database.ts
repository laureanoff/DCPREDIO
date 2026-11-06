// Tipos generados desde el esquema de Supabase (proyecto dc-predio). Regenerar tras cada migración.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          changed_at: string;
          changed_by: string | null;
          id: number;
          new_data: Json | null;
          old_data: Json | null;
          record_id: string | null;
          table_name: string;
        };
        Insert: {
          action: string;
          changed_at?: string;
          changed_by?: string | null;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          record_id?: string | null;
          table_name: string;
        };
        Update: {
          action?: string;
          changed_at?: string;
          changed_by?: string | null;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          record_id?: string | null;
          table_name?: string;
        };
        Relationships: [];
      };
      blocked_slots: {
        Row: {
          court_id: string;
          created_at: string;
          created_by: string | null;
          end_at: string;
          id: string;
          reason: string | null;
          start_at: string;
        };
        Insert: {
          court_id: string;
          created_at?: string;
          created_by?: string | null;
          end_at: string;
          id?: string;
          reason?: string | null;
          start_at: string;
        };
        Update: {
          court_id?: string;
          created_at?: string;
          created_by?: string | null;
          end_at?: string;
          id?: string;
          reason?: string | null;
          start_at?: string;
        };
        Relationships: [
          { foreignKeyName: "blocked_slots_court_id_fkey"; columns: ["court_id"]; isOneToOne: false; referencedRelation: "courts"; referencedColumns: ["id"] },
          { foreignKeyName: "blocked_slots_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      bookings: {
        Row: {
          booking_date: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          court_id: string;
          created_at: string;
          created_by: string | null;
          customer_name: string;
          customer_phone: string;
          end_at: string;
          id: string;
          mode: Database["public"]["Enums"]["booking_mode"];
          notes: string | null;
          players: number;
          source: string;
          start_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          total_price: number;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          booking_date?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          code: string;
          court_id: string;
          created_at?: string;
          created_by?: string | null;
          customer_name: string;
          customer_phone: string;
          end_at: string;
          id?: string;
          mode: Database["public"]["Enums"]["booking_mode"];
          notes?: string | null;
          players?: number;
          source?: string;
          start_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total_price: number;
          unit_price: number;
          updated_at?: string;
        };
        Update: {
          booking_date?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          code?: string;
          court_id?: string;
          created_at?: string;
          created_by?: string | null;
          customer_name?: string;
          customer_phone?: string;
          end_at?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["booking_mode"];
          notes?: string | null;
          players?: number;
          source?: string;
          start_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total_price?: number;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "bookings_court_id_fkey"; columns: ["court_id"]; isOneToOne: false; referencedRelation: "courts"; referencedColumns: ["id"] },
          { foreignKeyName: "bookings_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      courts: {
        Row: { created_at: string; id: string; is_active: boolean; name: string; sort_order: number; updated_at: string };
        Insert: { created_at?: string; id?: string; is_active?: boolean; name: string; sort_order?: number; updated_at?: string };
        Update: { created_at?: string; id?: string; is_active?: boolean; name?: string; sort_order?: number; updated_at?: string };
        Relationships: [];
      };
      notification_logs: {
        Row: {
          attempts: number;
          booking_id: string | null;
          channel: string;
          created_at: string;
          error: string | null;
          id: string;
          last_attempt_at: string | null;
          provider_message_id: string | null;
          recipient_number: string | null;
          recipient_type: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["notification_status"];
          template_name: string | null;
        };
        Insert: {
          attempts?: number;
          booking_id?: string | null;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          provider_message_id?: string | null;
          recipient_number?: string | null;
          recipient_type: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          template_name?: string | null;
        };
        Update: {
          attempts?: number;
          booking_id?: string | null;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          provider_message_id?: string | null;
          recipient_number?: string | null;
          recipient_type?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          template_name?: string | null;
        };
        Relationships: [
          { foreignKeyName: "notification_logs_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: false; referencedRelation: "bookings"; referencedColumns: ["id"] },
        ];
      };
      operating_hours: {
        Row: { close_time: string; id: string; is_open: boolean; open_time: string; updated_at: string; weekday: number };
        Insert: { close_time: string; id?: string; is_open?: boolean; open_time: string; updated_at?: string; weekday: number };
        Update: { close_time?: string; id?: string; is_open?: boolean; open_time?: string; updated_at?: string; weekday?: number };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_voided: boolean;
          method: Database["public"]["Enums"]["payment_method"];
          notes: string | null;
          paid_at: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          amount: number;
          booking_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_voided?: boolean;
          method: Database["public"]["Enums"]["payment_method"];
          notes?: string | null;
          paid_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_voided?: boolean;
          method?: Database["public"]["Enums"]["payment_method"];
          notes?: string | null;
          paid_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          { foreignKeyName: "payments_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: false; referencedRelation: "bookings"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_voided_by_fkey"; columns: ["voided_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: { created_at: string; full_name: string; id: string; is_active: boolean; role: Database["public"]["Enums"]["app_role"]; updated_at: string };
        Insert: { created_at?: string; full_name: string; id: string; is_active?: boolean; role?: Database["public"]["Enums"]["app_role"]; updated_at?: string };
        Update: { created_at?: string; full_name?: string; id?: string; is_active?: boolean; role?: Database["public"]["Enums"]["app_role"]; updated_at?: string };
        Relationships: [];
      };
      special_days: {
        Row: { close_time: string | null; created_at: string; day: string; id: string; is_closed: boolean; note: string | null; open_time: string | null; updated_at: string };
        Insert: { close_time?: string | null; created_at?: string; day: string; id?: string; is_closed?: boolean; note?: string | null; open_time?: string | null; updated_at?: string };
        Update: { close_time?: string | null; created_at?: string; day?: string; id?: string; is_closed?: boolean; note?: string | null; open_time?: string | null; updated_at?: string };
        Relationships: [];
      };
      venue_settings: {
        Row: {
          address: string | null;
          booking_window_days: number;
          contact_email: string | null;
          contact_phone: string | null;
          contact_whatsapp: string | null;
          currency: string;
          id: number;
          logo_url: string | null;
          max_active_bookings_per_phone: number;
          max_players: number;
          notification_whatsapp_number: string | null;
          price_group: number;
          price_individual: number;
          primary_color: string;
          require_confirmation: boolean;
          slot_duration_minutes: number;
          slot_gap_minutes: number;
          timezone: string;
          updated_at: string;
          venue_name: string;
        };
        Insert: {
          address?: string | null;
          booking_window_days?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          currency?: string;
          id?: number;
          logo_url?: string | null;
          max_active_bookings_per_phone?: number;
          max_players?: number;
          notification_whatsapp_number?: string | null;
          price_group?: number;
          price_individual?: number;
          primary_color?: string;
          require_confirmation?: boolean;
          slot_duration_minutes?: number;
          slot_gap_minutes?: number;
          timezone?: string;
          updated_at?: string;
          venue_name?: string;
        };
        Update: {
          address?: string | null;
          booking_window_days?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          currency?: string;
          id?: number;
          logo_url?: string | null;
          max_active_bookings_per_phone?: number;
          max_players?: number;
          notification_whatsapp_number?: string | null;
          price_group?: number;
          price_individual?: number;
          primary_color?: string;
          require_confirmation?: boolean;
          slot_duration_minutes?: number;
          slot_gap_minutes?: number;
          timezone?: string;
          updated_at?: string;
          venue_name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      booking_financials: {
        Row: {
          balance: number | null;
          booking_id: string | null;
          payment_status: string | null;
          total_paid: number | null;
          total_price: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_public_booking: {
        Args: {
          p_court_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_mode: Database["public"]["Enums"]["booking_mode"];
          p_notes?: string;
          p_players: number;
          p_start_at: string;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      day_slots: { Args: { p_date: string }; Returns: { slot_end: string; slot_start: string }[] };
      get_day_availability: {
        Args: { p_court_id: string; p_date: string };
        Returns: {
          capacity: number;
          has_pending: boolean;
          slot_end: string;
          slot_start: string;
          spots_left: number;
          state: string;
        }[];
      };
      get_month_availability: {
        Args: { p_court_id: string; p_month: number; p_year: number };
        Returns: { day: string; free_slots: number; is_open: boolean; total_slots: number }[];
      };
    };
    Enums: {
      app_role: "admin" | "staff";
      booking_mode: "individual" | "group";
      booking_status: "pending" | "confirmed" | "cancelled" | "completed";
      notification_status: "pending" | "sent" | "failed";
      payment_method: "cash" | "transfer" | "other";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
