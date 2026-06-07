import { pgTable, serial, varchar, text, timestamp, boolean, integer, numeric, jsonb, index, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// System table - do not delete
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// === Categories ===
export const categories = pgTable(
	"categories",
	{
		id: serial().primaryKey(),
		slug: varchar("slug", { length: 50 }).notNull().unique(),
		label: varchar("label", { length: 100 }).notNull(),
		image: text("image"),
		sort_order: integer("sort_order").default(0).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("categories_slug_idx").on(table.slug),
		index("categories_sort_order_idx").on(table.sort_order),
	]
);

// === Products ===
export const products = pgTable(
	"products",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 255 }).notNull(),
		category_id: integer("category_id").notNull().references(() => categories.id),
		series: varchar("series", { length: 100 }),
		sku: varchar("sku", { length: 50 }).notNull().unique(),
		wholesale_price: numeric("wholesale_price", { precision: 10, scale: 2 }).notNull(),
		moq: integer("moq").notNull().default(50),
		lead_time: varchar("lead_time", { length: 100 }),
		packaging: text("packaging"),
		description: text("description"),
		care_instructions: text("care_instructions"),
		is_new: boolean("is_new").default(false).notNull(),
		is_featured: boolean("is_featured").default(false).notNull(),
		is_active: boolean("is_active").default(true).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("products_category_id_idx").on(table.category_id),
		index("products_sku_idx").on(table.sku),
		index("products_is_featured_idx").on(table.is_featured),
		index("products_is_active_idx").on(table.is_active),
		index("products_created_at_idx").on(table.created_at),
	]
);

// === Product Images ===
export const productImages = pgTable(
	"product_images",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		sort_order: integer("sort_order").default(0).notNull(),
	},
	(table) => [
		index("product_images_product_id_idx").on(table.product_id),
	]
);

// === Product Bulk Pricing Tiers ===
export const productBulkPricing = pgTable(
	"product_bulk_pricing",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		min_qty: integer("min_qty").notNull(),
		max_qty: integer("max_qty"),
		unit_price: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
	},
	(table) => [
		index("product_bulk_pricing_product_id_idx").on(table.product_id),
	]
);

// === Product Colors ===
export const productColors = pgTable(
	"product_colors",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 50 }).notNull(),
		hex: varchar("hex", { length: 7 }).notNull(),
	},
	(table) => [
		index("product_colors_product_id_idx").on(table.product_id),
	]
);

// === Product Size Labels ===
export const productSizes = pgTable(
	"product_sizes",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		size_label: varchar("size_label", { length: 10 }).notNull(),
		sort_order: integer("sort_order").default(0).notNull(),
	},
	(table) => [
		index("product_sizes_product_id_idx").on(table.product_id),
	]
);

// === Product Size Chart ===
export const productSizeChart = pgTable(
	"product_size_chart",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		size: varchar("size", { length: 10 }).notNull(),
		chest: integer("chest"),
		waist: integer("waist"),
		hip: integer("hip"),
		length: integer("length"),
		sleeve: integer("sleeve"),
	},
	(table) => [
		index("product_size_chart_product_id_idx").on(table.product_id),
	]
);

// === Product Materials ===
export const productMaterials = pgTable(
	"product_materials",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		fabric: text("fabric"),
		lining: text("lining"),
		craft: text("craft"),
	},
	(table) => [
		index("product_materials_product_id_idx").on(table.product_id),
	]
);

// === Product Design Details ===
export const productDesignDetails = pgTable(
	"product_design_details",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		detail_text: text("detail_text").notNull(),
		sort_order: integer("sort_order").default(0).notNull(),
	},
	(table) => [
		index("product_design_details_product_id_idx").on(table.product_id),
	]
);

// === Product Certifications ===
export const productCertifications = pgTable(
	"product_certifications",
	{
		id: serial().primaryKey(),
		product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
		cert_name: varchar("cert_name", { length: 100 }).notNull(),
	},
	(table) => [
		index("product_certifications_product_id_idx").on(table.product_id),
	]
);

// === RFQs (Request for Quote) ===
export const rfqs = pgTable(
	"rfqs",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		company_name: varchar("company_name", { length: 255 }).notNull(),
		contact_person: varchar("contact_person", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		phone: varchar("phone", { length: 50 }),
		country: varchar("country", { length: 100 }),
		business_type: varchar("business_type", { length: 100 }),
		quantity_range: varchar("quantity_range", { length: 50 }),
		customization: jsonb("customization"),
		message: text("message"),
		status: varchar("status", { length: 20 }).notNull().default("new"),
		notes: text("notes"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("rfqs_status_idx").on(table.status),
		index("rfqs_created_at_idx").on(table.created_at),
		index("rfqs_email_idx").on(table.email),
	]
);

// === RFQ Items (products in an RFQ) ===
export const rfqItems = pgTable(
	"rfq_items",
	{
		id: serial().primaryKey(),
		rfq_id: varchar("rfq_id", { length: 36 }).notNull().references(() => rfqs.id, { onDelete: "cascade" }),
		product_id: varchar("product_id", { length: 36 }).references(() => products.id),
		quantity: integer("quantity"),
		notes: text("notes"),
	},
	(table) => [
		index("rfq_items_rfq_id_idx").on(table.rfq_id),
		index("rfq_items_product_id_idx").on(table.product_id),
	]
);

// === Leads (Potential Customers) ===
export const leads = pgTable(
	"leads",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		company_name: varchar("company_name", { length: 255 }).notNull(),
		contact_person: varchar("contact_person", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		phone: varchar("phone", { length: 50 }),
		country: varchar("country", { length: 100 }),
		source: varchar("source", { length: 50 }).notNull().default("website"),
		status: varchar("status", { length: 20 }).notNull().default("new"),
		estimated_value: numeric("estimated_value", { precision: 10, scale: 2 }),
		products_interest: text("products_interest"),
		next_follow_up: timestamp("next_follow_up", { withTimezone: true }),
		notes: text("notes"),
		assigned_to: varchar("assigned_to", { length: 36 }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("leads_status_idx").on(table.status),
		index("leads_source_idx").on(table.source),
		index("leads_created_at_idx").on(table.created_at),
		index("leads_email_idx").on(table.email),
	]
);

// === Lead Activities (Interactions/Touchpoints) ===
export const leadActivities = pgTable(
	"lead_activities",
	{
		id: serial().primaryKey(),
		lead_id: varchar("lead_id", { length: 36 }).notNull().references(() => leads.id, { onDelete: "cascade" }),
		type: varchar("type", { length: 30 }).notNull().default("note"),
		subject: varchar("subject", { length: 255 }),
		content: text("content").notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("lead_activities_lead_id_idx").on(table.lead_id),
	]
);

// === Admin Profiles ===
// Pairs a Supabase Auth user (auth.users) with a role. The id MUST match
// the auth.users.id UUID — sign-ups for staff happen via the Supabase
// dashboard or a server-side admin invite, then a row is inserted here.
export const adminProfiles = pgTable(
	"admin_profiles",
	{
		id: uuid("id").primaryKey(), // FK to auth.users.id, populated by trigger
		email: varchar("email", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 128 }).notNull(),
		role: varchar("role", { length: 20 }).notNull().default("admin"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("admin_profiles_email_idx").on(table.email),
		index("admin_profiles_role_idx").on(table.role),
	],
);
