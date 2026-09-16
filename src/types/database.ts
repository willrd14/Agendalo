export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          primary_color: string;
          secondary_color: string;
          phone: string;
          email: string;
          address: string | null;
          timezone: string;
          currency: string;
          cancellation_hours: number;
          sms_reminders_enabled: boolean | null;
          reminder_message_template: string | null;
          deposit_required: boolean;
          deposit_type: "percentage" | "fixed";
          deposit_percentage: number;
          deposit_fixed_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          phone: string;
          email: string;
          address?: string | null;
          timezone?: string;
          currency?: string;
          cancellation_hours?: number;
          sms_reminders_enabled?: boolean | null;
          reminder_message_template?: string | null;
          deposit_required?: boolean;
          deposit_type?: "percentage" | "fixed";
          deposit_percentage?: number;
          deposit_fixed_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          phone?: string;
          email?: string;
          address?: string | null;
          timezone?: string;
          currency?: string;
          cancellation_hours?: number;
          sms_reminders_enabled?: boolean | null;
          reminder_message_template?: string | null;
          deposit_required?: boolean;
          deposit_type?: "percentage" | "fixed";
          deposit_percentage?: number;
          deposit_fixed_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price: number;
          currency: string;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          duration_minutes: number;
          price: number;
          currency?: string;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          price?: number;
          currency?: string;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      availability: {
        Row: {
          id: string;
          business_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          employee_id: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          employee_id?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
          employee_id?: string | null;
        };
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          client_id: string;
          employee_id: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status: "pending" | "confirmed" | "cancelled" | "completed";
          notes: string | null;
          cancellation_reason: string | null;
          google_calendar_event_id: string | null;
          deposit_amount: number | null;
          deposit_status: "unpaid" | "paid" | "refunded" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          client_id: string;
          employee_id?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status?: "pending" | "confirmed" | "cancelled" | "completed";
          notes?: string | null;
          cancellation_reason?: string | null;
          google_calendar_event_id?: string | null;
          deposit_amount?: number | null;
          deposit_status?: "unpaid" | "paid" | "refunded" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          client_id?: string;
          employee_id?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: "pending" | "confirmed" | "cancelled" | "completed";
          notes?: string | null;
          cancellation_reason?: string | null;
          google_calendar_event_id?: string | null;
          deposit_amount?: number | null;
          deposit_status?: "unpaid" | "paid" | "refunded" | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan: "basic" | "pro";
          status: "active" | "cancelled" | "past_due";
          paypal_subscription_id: string | null;
          current_period_start: string;
          current_period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan: "basic" | "pro";
          status?: "active" | "cancelled" | "past_due";
          paypal_subscription_id?: string | null;
          current_period_start: string;
          current_period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          plan?: "basic" | "pro";
          status?: "active" | "cancelled" | "past_due";
          paypal_subscription_id?: string | null;
          current_period_start?: string;
          current_period_end?: string;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          business_id: string;
          appointment_id: string | null;
          amount: number;
          currency: string;
          method: "paypal" | "transfer";
          status: "pending" | "completed" | "failed" | "refunded";
          paypal_transaction_id: string | null;
          /** True when this payment was a deposit, not the full service price (QA-7). */
          is_deposit: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          appointment_id?: string | null;
          amount: number;
          currency: string;
          method: "paypal" | "transfer";
          status?: "pending" | "completed" | "failed" | "refunded";
          paypal_transaction_id?: string | null;
          is_deposit?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          appointment_id?: string | null;
          amount?: number;
          currency?: string;
          method?: "paypal" | "transfer";
          status?: "pending" | "completed" | "failed" | "refunded";
          paypal_transaction_id?: string | null;
          is_deposit?: boolean;
          created_at?: string;
        };
      };
      payment_sessions: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          notes: string | null;
          appointment_date: string;
          start_time: string;
          end_time: string;
          cancel_token: string | null;
          amount_dop: number;
          currency: string;
          amount_usd: number;
          status: "pending" | "completed" | "failed" | "cancelled";
          session_type: "full" | "deposit";
          paypal_order_id: string | null;
          paypal_capture_id: string | null;
          /** Client IP captured at session creation, used for rate limiting (A-3). */
          client_ip: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          client_name?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          notes?: string | null;
          appointment_date: string;
          start_time: string;
          end_time: string;
          cancel_token?: string | null;
          amount_dop: number;
          currency?: string;
          amount_usd: number;
          status?: "pending" | "completed" | "failed" | "cancelled";
          session_type?: "full" | "deposit";
          paypal_order_id?: string | null;
          paypal_capture_id?: string | null;
          client_ip?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          client_name?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          notes?: string | null;
          appointment_date?: string;
          start_time?: string;
          end_time?: string;
          cancel_token?: string | null;
          amount_dop?: number;
          currency?: string;
          amount_usd?: number;
          status?: "pending" | "completed" | "failed" | "cancelled";
          session_type?: "full" | "deposit";
          paypal_order_id?: string | null;
          paypal_capture_id?: string | null;
          client_ip?: string | null;
          created_at?: string;
          expires_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "email" | "sms";
          subject: string;
          content: string;
          status: "pending" | "sent" | "failed";
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "email" | "sms";
          subject: string;
          content: string;
          status?: "pending" | "sent" | "failed";
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "email" | "sms";
          subject?: string;
          content?: string;
          status?: "pending" | "sent" | "failed";
          sent_at?: string | null;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          specialty: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          specialty?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          specialty?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          sku: string | null;
          current_stock: number;
          min_stock: number;
          unit: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          sku?: string | null;
          current_stock?: number;
          min_stock?: number;
          unit?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          sku?: string | null;
          current_stock?: number;
          min_stock?: number;
          unit?: string | null;
          created_at?: string;
        };
      };
      service_inventory: {
        Row: {
          service_id: string;
          item_id: string;
          quantity_required: number;
        };
        Insert: {
          service_id: string;
          item_id: string;
          quantity_required: number;
        };
        Update: {
          service_id?: string;
          item_id?: string;
          quantity_required?: number;
        };
      };
      inventory_transactions: {
        Row: {
          id: string;
          item_id: string;
          quantity: number;
          type: "in" | "out" | "adjustment" | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          quantity: number;
          type?: "in" | "out" | "adjustment" | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          quantity?: number;
          type?: "in" | "out" | "adjustment" | null;
          reason?: string | null;
          created_at?: string;
        };
      };
      waiting_list: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          client_id: string;
          preferred_date: string | null;
          status: "pending" | "notified" | "booked" | "expired" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          client_id: string;
          preferred_date?: string | null;
          status?: "pending" | "notified" | "booked" | "expired" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          client_id?: string;
          preferred_date?: string | null;
          status?: "pending" | "notified" | "booked" | "expired" | null;
          created_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          business_id: string;
          code: string;
          discount_type: "percentage" | "fixed" | null;
          value: number;
          expires_at: string | null;
          usage_limit: number | null;
          used_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          code: string;
          discount_type?: "percentage" | "fixed" | null;
          value: number;
          expires_at?: string | null;
          usage_limit?: number | null;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          code?: string;
          discount_type?: "percentage" | "fixed" | null;
          value?: number;
          expires_at?: string | null;
          usage_limit?: number | null;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
    Enums: {
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed";
      subscription_plan: "basic" | "pro";
      subscription_status: "active" | "cancelled" | "past_due";
      payment_method: "paypal" | "transfer";
      payment_status: "pending" | "completed" | "failed" | "refunded";
      notification_type: "email" | "sms";
      notification_status: "pending" | "sent" | "failed";
      deposit_status: "unpaid" | "paid" | "refunded";
    };
  };
}
