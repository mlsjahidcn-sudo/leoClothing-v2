/**
 * Zod schemas for admin write operations.
 *
 * These are intentionally strict — anything that doesn't match is
 * rejected with a 400. The frontend should already validate, but the
 * server is the source of truth.
 */
import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'hex must be #RRGGBB');
const sizeLabel = z.string().min(1).max(10);
const positiveInt = z.number().int().nonnegative();
const nonNegativeNumber = z.number().nonnegative();

export const productImageInput = z.object({
  url: z.string().min(1),
  sort_order: positiveInt.optional(),
});

export const bulkPricingInput = z.object({
  min_qty: positiveInt,
  max_qty: positiveInt.nullable().optional(),
  unit_price: z.union([z.string(), nonNegativeNumber]).transform(String),
});

export const productColorInput = z.object({
  name: z.string().min(1).max(50),
  hex: hexColor,
});

export const productSizeInput = z.object({
  size_label: sizeLabel,
  sort_order: positiveInt.optional(),
});

export const productSizeChartRow = z.object({
  size: sizeLabel,
  chest: positiveInt.nullable().optional(),
  waist: positiveInt.nullable().optional(),
  hip: positiveInt.nullable().optional(),
  length: positiveInt.nullable().optional(),
  sleeve: positiveInt.nullable().optional(),
});

export const productMaterialInput = z.object({
  fabric: z.string().optional().default(''),
  lining: z.string().optional().default(''),
  craft: z.string().optional().default(''),
});

export const productDesignDetailInput = z.object({
  detail_text: z.string().min(1),
  sort_order: positiveInt.optional(),
});

export const productCertificationInput = z.object({
  cert_name: z.string().min(1).max(100),
});

export const productWriteSchema = z.object({
  name: z.string().min(1).max(255),
  series: z.string().max(100).optional().nullable(),
  sku: z.string().min(1).max(50),
  wholesale_price: z.union([z.string(), nonNegativeNumber]).transform(String),
  moq: positiveInt.default(50),
  lead_time: z.string().max(100).optional().nullable(),
  packaging: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  care_instructions: z.string().optional().nullable(),
  is_new: z.boolean().optional().default(false),
  is_featured: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  category_id: positiveInt,
  images: z.array(productImageInput).optional(),
  bulk_pricing: z.array(bulkPricingInput).optional(),
  colors: z.array(productColorInput).optional(),
  sizes: z.array(productSizeInput).optional(),
  size_chart: z.array(productSizeChartRow).optional(),
  materials: z.array(productMaterialInput).optional(),
  design_details: z.array(productDesignDetailInput).optional(),
  certifications: z.array(productCertificationInput).optional(),
});

export type ProductWritePayload = z.infer<typeof productWriteSchema>;

export const rfqWriteSchema = z.object({
  status: z.enum(['new', 'reviewing', 'quoted', 'closed']).optional(),
  notes: z.string().nullable().optional(),
});

export type RfqWritePayload = z.infer<typeof rfqWriteSchema>;

export const leadWriteSchema = z.object({
  company_name: z.string().min(1).max(255),
  contact_person: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  source: z.string().max(50).optional().default('manual'),
  status: z.string().max(20).optional().default('new'),
  estimated_value: z.union([z.string(), z.number(), z.null()]).optional(),
  products_interest: z.string().optional().nullable(),
  next_follow_up: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export type LeadWritePayload = z.infer<typeof leadWriteSchema>;

export const rfqItemInput = z.object({
  product_id: z.string().min(1),
  quantity: positiveInt.optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const publicRfqSchema = z.object({
  company_name: z.string().min(1).max(255),
  contact_person: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  business_type: z.string().max(100).optional().nullable(),
  quantity_range: z.string().max(50).optional().nullable(),
  customization: z.array(z.string()).optional().nullable(),
  message: z.string().optional().nullable(),
  items: z.array(rfqItemInput).optional(),
});

export type PublicRfqPayload = z.infer<typeof publicRfqSchema>;

// === Chatbot ===
// Widget bootstraps a conversation on first open. We used to require
// name + email + company up front, but that gate blocked casual
// visitors and made the chat feel like a sales form. Now the widget
// POSTs only an opaque `visitor_token` and the server creates an
// anonymous stub lead (`Anonymous Visitor` / `<token>@anonymous.local`)
// so the schema's `chatbot_conversations.lead_id NOT NULL` constraint
// is satisfied without forcing the visitor to fill anything in.
export const chatbotStartSchema = z.object({
  // Opaque token generated by the widget on first open. Used so a
  // returning visitor doesn't get a new transcript every refresh.
  // Not a session/auth token — anyone with the conversation_id can
  // post to it, by design.
  visitor_token: z.string().min(8).max(128),
});

export type ChatbotStartPayload = z.infer<typeof chatbotStartSchema>;

// Single chat turn from the visitor. conversation_id is server-issued
// from /api/chatbot/leads — the frontend never invents one.
export const chatbotMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export type ChatbotMessagePayload = z.infer<typeof chatbotMessageSchema>;
