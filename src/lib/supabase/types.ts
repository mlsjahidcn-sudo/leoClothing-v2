/**
 * Strongly-typed Database for the `supabase-js` client.
 *
 * Regenerate this file (or expand it by hand) whenever the SQL schema
 * in `supabase/migrations/` changes. The shape mirrors what PostgREST
 * returns — for any view, table, or function that hits the wire.
 */
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
      categories: {
        Row: {
          id: number;
          slug: string;
          label: string;
          image: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          slug: string;
          label: string;
          image?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category_id: number;
          series: string | null;
          sku: string;
          wholesale_price: string;
          moq: number;
          lead_time: string | null;
          packaging: string | null;
          description: string | null;
          care_instructions: string | null;
          is_new: boolean;
          is_featured: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          category_id: number;
          series?: string | null;
          sku: string;
          wholesale_price: string | number;
          moq?: number;
          lead_time?: string | null;
          packaging?: string | null;
          description?: string | null;
          care_instructions?: string | null;
          is_new?: boolean;
          is_featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      product_images: {
        Row: {
          id: number;
          product_id: string;
          url: string;
          sort_order: number;
        };
        Insert: {
          id?: number;
          product_id: string;
          url: string;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_bulk_pricing: {
        Row: {
          id: number;
          product_id: string;
          min_qty: number;
          max_qty: number | null;
          unit_price: string;
        };
        Insert: {
          id?: number;
          product_id: string;
          min_qty: number;
          max_qty?: number | null;
          unit_price: string | number;
        };
        Update: Partial<Database['public']['Tables']['product_bulk_pricing']['Insert']>;
        Relationships: [];
      };
      product_colors: {
        Row: { id: number; product_id: string; name: string; hex: string };
        Insert: {
          id?: number;
          product_id: string;
          name: string;
          hex: string;
        };
        Update: Partial<Database['public']['Tables']['product_colors']['Insert']>;
        Relationships: [];
      };
      product_sizes: {
        Row: { id: number; product_id: string; size_label: string; sort_order: number };
        Insert: {
          id?: number;
          product_id: string;
          size_label: string;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['product_sizes']['Insert']>;
        Relationships: [];
      };
      product_size_chart: {
        Row: {
          id: number;
          product_id: string;
          size: string;
          chest: number | null;
          waist: number | null;
          hip: number | null;
          length: number | null;
          sleeve: number | null;
        };
        Insert: {
          id?: number;
          product_id: string;
          size: string;
          chest?: number | null;
          waist?: number | null;
          hip?: number | null;
          length?: number | null;
          sleeve?: number | null;
        };
        Update: Partial<Database['public']['Tables']['product_size_chart']['Insert']>;
        Relationships: [];
      };
      product_materials: {
        Row: {
          id: number;
          product_id: string;
          fabric: string | null;
          lining: string | null;
          craft: string | null;
        };
        Insert: {
          id?: number;
          product_id: string;
          fabric?: string | null;
          lining?: string | null;
          craft?: string | null;
        };
        Update: Partial<Database['public']['Tables']['product_materials']['Insert']>;
        Relationships: [];
      };
      product_design_details: {
        Row: { id: number; product_id: string; detail_text: string; sort_order: number };
        Insert: {
          id?: number;
          product_id: string;
          detail_text: string;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['product_design_details']['Insert']>;
        Relationships: [];
      };
      product_certifications: {
        Row: { id: number; product_id: string; cert_name: string };
        Insert: { id?: number; product_id: string; cert_name: string };
        Update: Partial<Database['public']['Tables']['product_certifications']['Insert']>;
        Relationships: [];
      };
      rfqs: {
        Row: {
          id: string;
          company_name: string;
          contact_person: string;
          email: string;
          phone: string | null;
          country: string | null;
          business_type: string | null;
          quantity_range: string | null;
          customization: Json | null;
          message: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_person: string;
          email: string;
          phone?: string | null;
          country?: string | null;
          business_type?: string | null;
          quantity_range?: string | null;
          customization?: Json | null;
          message?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['rfqs']['Insert']>;
        Relationships: [];
      };
      rfq_items: {
        Row: {
          id: number;
          rfq_id: string;
          product_id: string | null;
          quantity: number | null;
          notes: string | null;
        };
        Insert: {
          id?: number;
          rfq_id: string;
          product_id?: string | null;
          quantity?: number | null;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['rfq_items']['Insert']>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          company_name: string;
          contact_person: string;
          email: string;
          phone: string | null;
          country: string | null;
          source: string;
          status: string;
          estimated_value: string | null;
          products_interest: string | null;
          next_follow_up: string | null;
          notes: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_person: string;
          email: string;
          phone?: string | null;
          country?: string | null;
          source?: string;
          status?: string;
          estimated_value?: string | number | null;
          products_interest?: string | null;
          next_follow_up?: string | null;
          notes?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
        Relationships: [];
      };
      lead_activities: {
        Row: {
          id: number;
          lead_id: string;
          type: string;
          subject: string | null;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          lead_id: string;
          type?: string;
          subject?: string | null;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lead_activities']['Insert']>;
        Relationships: [];
      };
      admin_profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: string;
          created_at: string;
          // Added in migration 0002_admin_whatsapp.sql — free-text, expected
          // E.164 (+8615975614041) but not enforced; admins may paste the
          // format they actually use on their phone.
          whatsapp: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: string;
          created_at?: string;
          whatsapp?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['admin_profiles']['Insert']>;
        Relationships: [];
      };
      // Added in migration 0007_chatbot.sql. One row per visitor chat
      // session; FK to leads (cascade-delete) so removing a lead also
      // drops its transcript. Public writes are service-role only;
      // admin SELECT is gated by RLS policy `chatbot_conversations_admin_read`.
      chatbot_conversations: {
        Row: {
          id: string;
          lead_id: string;
          visitor_token: string;
          status: string;
          message_count: number;
          last_message_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          visitor_token: string;
          status?: string;
          message_count?: number;
          last_message_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<
          Database['public']['Tables']['chatbot_conversations']['Insert']
        >;
        Relationships: [
          {
            foreignKeyName: 'chatbot_conversations_lead_id_fkey';
            columns: ['lead_id'];
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      // Added in migration 0007_chatbot.sql. Rolling transcript.
      // `cited_product_ids` lets the admin see "which products the bot
      // talked about" without scraping assistant text. Admin SELECT
      // gated by RLS policy `chatbot_messages_admin_read`.
      chatbot_messages: {
        Row: {
          id: number;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          cited_product_ids: string[];
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          cited_product_ids?: string[];
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['chatbot_messages']['Insert']
        >;
        Relationships: [
          {
            foreignKeyName: 'chatbot_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            referencedRelation: 'chatbot_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    // See supabase/migrations/0002_admin_whatsapp.sql.
    // The `public_admin_whatsapp` view returns at most one non-empty
    // WhatsApp number from the active admin. Exposed to anon +
    // authenticated so the public site can render a "Chat on WhatsApp"
    // button without going through the admin API.
    Views: {
      public_admin_whatsapp: {
        Row: { whatsapp: string | null };
        // Views are read-only.
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
