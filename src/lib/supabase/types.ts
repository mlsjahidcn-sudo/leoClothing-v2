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
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admin_profiles']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
