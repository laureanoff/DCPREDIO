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
          started_at: string | null;
          finished_at: string | null;
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
          started_at?: string | null;
          finished_at?: string | null;
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
          started_at?: string | null;
          finished_at?: string | null;
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
      buffet_products: {
        Row: { created_at: string; id: string; is_active: boolean; low_stock_threshold: number; name: string; price: number; sort_order: number; stock: number; track_stock: boolean; updated_at: string };
        Insert: { created_at?: string; id?: string; is_active?: boolean; low_stock_threshold?: number; name: string; price: number; sort_order?: number; stock?: number; track_stock?: boolean; updated_at?: string };
        Update: { created_at?: string; id?: string; is_active?: boolean; low_stock_threshold?: number; name?: string; price?: number; sort_order?: number; stock?: number; track_stock?: boolean; updated_at?: string };
        Relationships: [];
      };
      buffet_sales: {
        Row: {
          booking_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          is_voided: boolean;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          total: number;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: "buffet_sales_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: false; referencedRelation: "bookings"; referencedColumns: ["id"] },
        ];
      };
      buffet_sale_items: {
        Row: { id: string; product_id: string | null; product_name: string; quantity: number; sale_id: string; unit_price: number };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: "buffet_sale_items_sale_id_fkey"; columns: ["sale_id"]; isOneToOne: false; referencedRelation: "buffet_sales"; referencedColumns: ["id"] },
        ];
      };
      training_activities: {
        Row: { created_at: string; description: string | null; id: string; is_active: boolean; location: string | null; name: string; sort_order: number };
        Insert: { created_at?: string; description?: string | null; id?: string; is_active?: boolean; location?: string | null; name: string; sort_order?: number };
        Update: { description?: string | null; is_active?: boolean; location?: string | null; name?: string; sort_order?: number };
        Relationships: [];
      };
      training_packs: {
        Row: { activity_id: string; created_at: string; days_per_week: number; description: string | null; id: string; is_active: boolean; name: string; sort_order: number };
        Insert: { activity_id: string; created_at?: string; days_per_week: number; description?: string | null; id?: string; is_active?: boolean; name: string; sort_order?: number };
        Update: { days_per_week?: number; description?: string | null; is_active?: boolean; name?: string; sort_order?: number };
        Relationships: [];
      };
      training_pack_prices: {
        Row: { billing: string; pack_id: string; price: number };
        Insert: { billing: string; pack_id: string; price: number };
        Update: { price?: number };
        Relationships: [];
      };
      training_payments: {
        Row: { amount: number; concept: string | null; created_at: string; created_by: string | null; enrollment_id: string; id: string; is_voided: boolean; method: Database["public"]["Enums"]["payment_method"]; notes: string | null; paid_at: string; void_reason: string | null; voided_at: string | null };
        Insert: { amount: number; concept?: string | null; created_at?: string; created_by?: string | null; enrollment_id: string; id?: string; is_voided?: boolean; method: Database["public"]["Enums"]["payment_method"]; notes?: string | null; paid_at?: string; void_reason?: string | null; voided_at?: string | null };
        Update: { is_voided?: boolean; void_reason?: string | null; voided_at?: string | null };
        Relationships: [{ foreignKeyName: "training_payments_enrollment_id_fkey"; columns: ["enrollment_id"]; isOneToOne: false; referencedRelation: "training_enrollments"; referencedColumns: ["id"] }];
      };
      training_students: {
        Row: { birth_date: string | null; created_at: string; email: string | null; emergency_contact: string | null; full_name: string; guardian_name: string; health_notes: string | null; id: string; phone: string };
        Insert: { birth_date?: string | null; created_at?: string; email?: string | null; emergency_contact?: string | null; full_name: string; guardian_name: string; health_notes?: string | null; id?: string; phone: string };
        Update: { birth_date?: string | null; email?: string | null; emergency_contact?: string | null; full_name?: string; guardian_name?: string; health_notes?: string | null; phone?: string };
        Relationships: [];
      };
      training_sessions: {
        Row: { activity_id: string | null; created_at: string; details: string | null; end_time: string | null; id: string; is_active: boolean; start_time: string; title: string; weekday: number };
        Insert: { activity_id?: string | null; created_at?: string; details?: string | null; end_time?: string | null; id?: string; is_active?: boolean; start_time: string; title: string; weekday: number };
        Update: { activity_id?: string | null; details?: string | null; end_time?: string | null; is_active?: boolean; start_time?: string; title?: string; weekday?: number };
        Relationships: [];
      };
      training_settings: {
        Row: { benefits: Json; benefits_title: string; hero_tagline: string; hero_text: string; proposals: Json; proposals_title: string; show_prices: boolean; show_schedule: boolean; coach_photo_path: string | null; coach_photo_url: string | null; coach_photo_x: number; coach_photo_y: number; coach_photo_zoom: number; coach_story: string; coach_bio: string; coach_name: string; coach_title: string; id: boolean; show_coach: boolean; updated_at: string };
        Insert: { benefits?: Json; benefits_title?: string; hero_tagline?: string; hero_text?: string; proposals?: Json; proposals_title?: string; show_prices?: boolean; show_schedule?: boolean; coach_photo_path?: string | null; coach_photo_url?: string | null; coach_photo_x?: number; coach_photo_y?: number; coach_photo_zoom?: number; coach_story?: string; coach_bio?: string; coach_name?: string; coach_title?: string; id?: boolean; show_coach?: boolean; updated_at?: string };
        Update: { benefits?: Json; benefits_title?: string; hero_tagline?: string; hero_text?: string; proposals?: Json; proposals_title?: string; show_prices?: boolean; show_schedule?: boolean; coach_photo_path?: string | null; coach_photo_url?: string | null; coach_photo_x?: number; coach_photo_y?: number; coach_photo_zoom?: number; coach_story?: string; coach_bio?: string; coach_name?: string; coach_title?: string; show_coach?: boolean; updated_at?: string };
        Relationships: [];
      };
      training_enrollments: {
        Row: {
          activity_name: string; billing: string; created_at: string; days_per_week: number; id: string; notes: string | null; pack_id: string | null; pack_name: string;
          preferred_days: number[]; preferred_time: string | null; price: number; staff_notes: string | null; start_date: string | null; status: string; student_id: string; updated_at: string;
        };
        Insert: {
          activity_name: string; billing: string; days_per_week: number; id?: string; notes?: string | null; pack_id?: string | null; pack_name: string;
          preferred_days?: number[]; preferred_time?: string | null; price: number; staff_notes?: string | null; start_date?: string | null; status?: string; student_id: string;
        };
        Update: { notes?: string | null; staff_notes?: string | null; start_date?: string | null; status?: string };
        Relationships: [{ foreignKeyName: "training_enrollments_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "training_students"; referencedColumns: ["id"] }];
      };
      waitlist_entries: {
        Row: { court_id: string; created_at: string; customer_name: string; customer_phone: string; end_at: string; id: string; start_at: string };
        Insert: { court_id: string; created_at?: string; customer_name: string; customer_phone: string; end_at: string; id?: string; start_at: string };
        Update: { customer_name?: string };
        Relationships: [];
      };
      push_subscriptions: {
        Row: { auth: string; created_at: string; endpoint: string; id: string; p256dh: string; user_agent: string | null; user_id: string };
        Insert: { auth: string; created_at?: string; endpoint: string; id?: string; p256dh: string; user_agent?: string | null; user_id: string };
        Update: { auth?: string; endpoint?: string; p256dh?: string; user_agent?: string | null };
        Relationships: [];
      };
      customer_push_subscriptions: {
        Row: { auth: string; booking_id: string; created_at: string; endpoint: string; id: string; p256dh: string };
        Insert: { auth: string; booking_id: string; created_at?: string; endpoint: string; id?: string; p256dh: string };
        Update: { auth?: string; endpoint?: string; p256dh?: string };
        Relationships: [];
      };
      gallery_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          kind: string;
          poster_storage_path: string | null;
          poster_url: string | null;
          sort_order: number;
          storage_path: string | null;
          title: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          kind: string;
          poster_storage_path?: string | null;
          poster_url?: string | null;
          sort_order?: number;
          storage_path?: string | null;
          title?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: string;
          poster_storage_path?: string | null;
          poster_url?: string | null;
          sort_order?: number;
          storage_path?: string | null;
          title?: string;
          url?: string;
        };
        Relationships: [];
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
          player_slot: number | null;
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
          player_slot?: number | null;
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
          player_slot?: number | null;
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
        Row: { created_at: string; full_name: string; id: string; is_active: boolean; role: Database["public"]["Enums"]["app_role"]; updated_at: string; username: string };
        Insert: { created_at?: string; full_name: string; id: string; is_active?: boolean; role?: Database["public"]["Enums"]["app_role"]; updated_at?: string; username: string };
        Update: { created_at?: string; full_name?: string; id?: string; is_active?: boolean; role?: Database["public"]["Enums"]["app_role"]; updated_at?: string; username?: string };
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
          allow_customer_cancellation: boolean;
          cancellation_cutoff_hours: number;
          latitude: number | null;
          longitude: number | null;
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
          allow_customer_cancellation?: boolean;
          cancellation_cutoff_hours?: number;
          latitude?: number | null;
          longitude?: number | null;
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
          allow_customer_cancellation?: boolean;
          cancellation_cutoff_hours?: number;
          latitude?: number | null;
          longitude?: number | null;
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
      create_training_enrollment: {
        Args: {
          p_pack_id: string; p_billing: string; p_student_name: string; p_birth_date: string | null; p_guardian_name: string; p_phone: string; p_email: string | null;
          p_emergency: string | null; p_health: string | null; p_days: number[]; p_time: string | null; p_notes: string | null;
        };
        Returns: string;
      };
      income_summary: {
        Args: {
          p_from: string;
          p_group: string;
          p_method?: Database["public"]["Enums"]["payment_method"];
          p_to: string;
        };
        Returns: { bucket: string; payments: number; total: number }[];
      };
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
      create_staff_booking: {
        Args: {
          p_court_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_notes?: string;
          p_start_at: string;
          p_status?: Database["public"]["Enums"]["booking_status"];
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      create_staff_booking_range: {
        Args: {
          p_court_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_first_start: string;
          p_last_start: string;
          p_notes?: string;
          p_status?: Database["public"]["Enums"]["booking_status"];
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      create_buffet_sale: {
        Args: { p_booking_id?: string; p_items: { product_id: string; quantity: number }[]; p_method: Database["public"]["Enums"]["payment_method"]; p_note?: string };
        Returns: Database["public"]["Tables"]["buffet_sales"]["Row"];
      };
      adjust_buffet_stock: { Args: { p_delta: number; p_id: string }; Returns: number };
      delete_buffet_sale: { Args: { p_id: string }; Returns: undefined };
      void_buffet_sale: { Args: { p_id: string; p_reason?: string }; Returns: undefined };
      buffet_summary: {
        Args: { p_from: string; p_to: string };
        Returns: { cash: number; other: number; sales: number; total: number; transfer: number }[];
      };
      buffet_top_products: {
        Args: { p_from: string; p_to: string };
        Returns: { product_name: string; quantity: number; total: number }[];
      };
      delete_cancelled_bookings: {
        Args: { p_ids?: string[]; p_include_paid?: boolean };
        Returns: { deleted: number; skipped: number }[];
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
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
