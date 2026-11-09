import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const textArray = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);

// ───────────────────────────── Enums
export const productStatus = pgEnum("product_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);
export const technology = pgEnum("technology", ["MULTI", "VLF", "PI", "IMAGING", "OTHER"]);
export const waterproof = pgEnum("waterproof", ["NONE", "COIL_ONLY", "FULL"]);
export const experience = pgEnum("experience", ["BEGINNER", "INTERMEDIATE", "PRO"]);
export const serialStatus = pgEnum("serial_status", ["IN_STOCK", "RESERVED", "SOLD", "RETURNED", "IN_SERVICE", "DEFECTIVE"]);
export const channel = pgEnum("channel", ["WHATSAPP", "WEB", "PHONE", "EMAIL", "INSTAGRAM"]);
export const conversationStatus = pgEnum("conversation_status", ["OPEN", "PENDING", "CLOSED"]);
export const serviceStatus = pgEnum("service_status", [
  "RECEIVED",
  "AWAITING_DEVICE",
  "IN_REPAIR",
  "WAITING_PART",
  "READY",
  "SHIPPED_BACK",
  "CLOSED",
]);
export const orderStatus = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);
export const paymentStatus = pgEnum("payment_status", ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]);
export const paymentMethod = pgEnum("payment_method", ["CARD", "TRANSFER"]);
export const deliveryMethod = pgEnum("delivery_method", ["CARGO", "PICKUP"]);
export const returnStatus = pgEnum("return_status", ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"]);
export const campaignType = pgEnum("campaign_type", ["PERCENT", "FIXED", "FREE_SHIPPING"]);
export const campaignScope = pgEnum("campaign_scope", ["ALL", "BRAND", "CATEGORY", "PRODUCT"]);
export const bannerPlacement = pgEnum("banner_placement", ["HERO", "SIDE", "STRIP", "CATEGORY"]);

// ───────────────────────────── Ekip, roller, denetim
export const roles = pgTable("roles", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: textArray("permissions"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  isActive: boolean("is_active").notNull().default(true),
  maxDiscountPct: integer("max_discount_pct").notNull().default(0),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

// ───────────────────────────── Katalog
export const brands = pgTable("brands", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortText: text("short_text"),
  description: text("description"),
  imageUrl: text("image_url"),
  parentId: text("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  showInMenu: boolean("show_in_menu").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoContent: text("seo_content"),
  createdAt: createdAt(),
});

export type Spec = { key: string; value: string };

export const products = pgTable(
  "products",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().unique(),
    barcode: text("barcode"),
    brandId: text("brand_id").references(() => brands.id, { onDelete: "set null" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    status: productStatus("status").notNull().default("DRAFT"),
    shortDescription: text("short_description"),
    description: text("description"),
    price: money("price").notNull(),
    compareAtPrice: money("compare_at_price"),
    costPrice: money("cost_price"),
    taxRate: integer("tax_rate").notNull().default(20),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
    trackSerial: boolean("track_serial").notNull().default(false),
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2, mode: "number" }),
    warrantyMonths: integer("warranty_months").notNull().default(24),
    technology: technology("technology"),
    waterproof: waterproof("waterproof"),
    experience: experience("experience"),
    useCases: textArray("use_cases"),
    badges: textArray("badges"),
    specs: jsonb("specs").$type<Spec[]>().notNull().default([]),
    boxContents: textArray("box_contents"),
    idealFor: textArray("ideal_for"),
    notFor: textArray("not_for"),
    videoUrl: text("video_url"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPro: boolean("is_pro").notNull().default(false),
    sameDayShipping: boolean("same_day_shipping").notNull().default(true),
    trialRentalPrice: money("trial_rental_price"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("product_status_idx").on(t.status), index("product_brand_idx").on(t.brandId), index("product_cat_idx").on(t.categoryId)],
);

export const productImages = pgTable("product_images", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serialNumbers = pgTable("serial_numbers", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  serial: text("serial").notNull().unique(),
  status: serialStatus("status").notNull().default("IN_STOCK"),
  orderItemId: text("order_item_id"),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  warrantyUntil: timestamp("warranty_until", { withTimezone: true }),
  note: text("note"),
  createdAt: createdAt(),
});

export const stockMovements = pgTable("stock_movements", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  note: text("note"),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const mediaAssets = pgTable("media_assets", {
  id: id(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  alt: text("alt"),
  createdAt: createdAt(),
});

// ───────────────────────────── Müşteri ve CRM
export const customers = pgTable("customers", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone").unique(),
  passwordHash: text("password_hash"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  tags: textArray("tags"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: createdAt(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const addresses = pgTable("addresses", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Ev"),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  line: text("line").notNull(),
  zip: text("zip"),
  isDefault: boolean("is_default").notNull().default(false),
});

export const customerNotes = pgTable("customer_notes", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const conversations = pgTable("conversations", {
  id: id(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  contactName: text("contact_name").notNull(),
  contact: text("contact").notNull(),
  channel: channel("channel").notNull().default("WEB"),
  subject: text("subject").notNull(),
  status: conversationStatus("status").notNull().default("OPEN"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const messages = pgTable("messages", {
  id: id(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  fromStaff: boolean("from_staff").notNull().default(false),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export type ServiceHistoryEntry = { status: string; note?: string; at: string; by?: string };

export const serviceRecords = pgTable("service_records", {
  id: id(),
  number: serial("number").notNull().unique(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  contactName: text("contact_name").notNull(),
  contact: text("contact").notNull(),
  productName: text("product_name").notNull(),
  serial: text("serial"),
  issue: text("issue").notNull(),
  status: serviceStatus("status").notNull().default("RECEIVED"),
  underWarranty: boolean("under_warranty").notNull().default(true),
  cost: money("cost"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  history: jsonb("history").$type<ServiceHistoryEntry[]>().notNull().default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const reviews = pgTable("reviews", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  isApproved: boolean("is_approved").notNull().default(false),
  reply: text("reply"),
  createdAt: createdAt(),
});

export const productQuestions = pgTable("product_questions", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: createdAt(),
});

export const stockAlerts = pgTable("stock_alerts", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  contact: text("contact").notNull(),
  notified: boolean("notified").notNull().default(false),
  createdAt: createdAt(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: id(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  consentAt: createdAt(),
});

// ───────────────────────────── Sipariş ve lojistik
export type ShippingAddress = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  line: string;
  zip?: string;
};

export const campaigns = pgTable("campaigns", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  type: campaignType("type").notNull(),
  value: money("value").notNull().default(0),
  code: text("code").unique(),
  scope: campaignScope("scope").notNull().default("ALL"),
  targetIds: textArray("target_ids"),
  minSubtotal: money("min_subtotal").notNull().default(0),
  maxDiscount: money("max_discount"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  perCustomerLimit: integer("per_customer_limit"),
  showOnSite: boolean("show_on_site").notNull().default(false),
  createdAt: createdAt(),
});

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: serial("number").notNull().unique(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    status: orderStatus("status").notNull().default("PENDING_PAYMENT"),
    paymentStatus: paymentStatus("payment_status").notNull().default("PENDING"),
    paymentMethod: paymentMethod("payment_method").notNull().default("CARD"),
    paymentRef: text("payment_ref"),
    paymentToken: text("payment_token"),
    paymentMeta: jsonb("payment_meta").$type<{ paymentId?: string; transactions?: { itemId: string; transactionId: string; price: number }[]; raw?: unknown }>(),
    installments: integer("installments").notNull().default(1),
    subtotal: money("subtotal").notNull(),
    discountTotal: money("discount_total").notNull().default(0),
    shippingTotal: money("shipping_total").notNull().default(0),
    total: money("total").notNull(),
    couponCode: text("coupon_code"),
    campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    deliveryMethod: deliveryMethod("delivery_method").notNull().default("CARGO"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
    invoiceType: text("invoice_type").notNull().default("INDIVIDUAL"),
    companyName: text("company_name"),
    taxOffice: text("tax_office"),
    taxNumber: text("tax_number"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    customerNote: text("customer_note"),
    internalNote: text("internal_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("order_status_idx").on(t.status), index("order_created_idx").on(t.createdAt)],
);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  imageUrl: text("image_url"),
  unitPrice: money("unit_price").notNull(),
  unitCost: money("unit_cost"),
  quantity: integer("quantity").notNull(),
  total: money("total").notNull(),
});

export const orderEvents = pgTable("order_events", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: createdAt(),
});

export const returnRequests = pgTable("return_requests", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: returnStatus("status").notNull().default("REQUESTED"),
  refundAmount: money("refund_amount"),
  returnCode: text("return_code"),
  resolution: text("resolution"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ───────────────────────────── Vitrin / CMS
export const banners = pgTable("banners", {
  id: id(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  eyebrow: text("eyebrow"),
  ctaLabel: text("cta_label"),
  imageUrl: text("image_url").notNull(),
  mobileImageUrl: text("mobile_image_url"),
  linkUrl: text("link_url"),
  showText: boolean("show_text").notNull().default(true),
  placement: bannerPlacement("placement").notNull().default("HERO"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const homeSections = pgTable("home_sections", {
  id: id(),
  type: text("type").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const pages = pgTable("pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  showInFooter: boolean("show_in_footer").notNull().default(true),
  footerGroup: text("footer_group").notNull().default("Sözleşmeler"),
  seoDescription: text("seo_description"),
  updatedAt: updatedAt(),
});

export const menuItems = pgTable("menu_items", {
  id: id(),
  location: text("location").notNull().default("HEADER"),
  label: text("label").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  highlight: boolean("highlight").notNull().default(false),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

// ───────────────────────────── SEO içerik: blog, SSS, sözlük, yönlendirme
export const postStatus = pgEnum("post_status", ["DRAFT", "PUBLISHED"]);
export const faqKind = pgEnum("faq_kind", ["FAQ", "GLOSSARY"]);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt"),
    /** Yapay zekâ ve öne çıkan snippet için 40–60 kelimelik doğrudan yanıt */
    answer: text("answer"),
    content: text("content").notNull().default(""),
    coverImage: text("cover_image"),
    category: text("category").notNull().default("Rehber"),
    tags: textArray("tags"),
    authorName: text("author_name").notNull().default("Bulgu Dedektör Uzman Ekibi"),
    authorTitle: text("author_title"),
    authorBio: text("author_bio"),
    status: postStatus("status").notNull().default("DRAFT"),
    faq: jsonb("faq").$type<{ q: string; a: string }[]>().notNull().default([]),
    relatedProductIds: textArray("related_product_ids"),
    relatedCategoryIds: textArray("related_category_ids"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("post_status_idx").on(t.status, t.publishedAt)],
);

export const faqs = pgTable("faqs", {
  id: id(),
  kind: faqKind("kind").notNull().default("FAQ"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  group: text("group").notNull().default("Genel"),
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  showOnHome: boolean("show_on_home").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const redirects = pgTable("redirects", {
  id: id(),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  hits: integer("hits").notNull().default(0),
  createdAt: createdAt(),
});

// ───────────────────────────── Relations
export const rolesRelations = relations(roles, ({ many }) => ({ users: many(users) }));
export const usersRelations = relations(users, ({ one }) => ({ role: one(roles, { fields: [users.roleId], references: [roles.id] }) }));
export const auditRelations = relations(auditLogs, ({ one }) => ({ user: one(users, { fields: [auditLogs.userId], references: [users.id] }) }));
export const brandsRelations = relations(brands, ({ many }) => ({ products: many(products) }));
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  products: many(products),
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "tree" }),
  children: many(categories, { relationName: "tree" }),
}));
export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  serials: many(serialNumbers),
  movements: many(stockMovements),
  reviews: many(reviews),
  questions: many(productQuestions),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const serialRelations = relations(serialNumbers, ({ one }) => ({
  product: one(products, { fields: [serialNumbers.productId], references: [products.id] }),
  orderItem: one(orderItems, { fields: [serialNumbers.orderItemId], references: [orderItems.id] }),
}));
export const movementRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  user: one(users, { fields: [stockMovements.userId], references: [users.id] }),
}));
export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  notes: many(customerNotes),
  conversations: many(conversations),
  serviceRecords: many(serviceRecords),
  returnRequests: many(returnRequests),
}));
export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
}));
export const notesRelations = relations(customerNotes, ({ one }) => ({
  customer: one(customers, { fields: [customerNotes.customerId], references: [customers.id] }),
  user: one(users, { fields: [customerNotes.userId], references: [users.id] }),
}));
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  customer: one(customers, { fields: [conversations.customerId], references: [customers.id] }),
  assignee: one(users, { fields: [conversations.assigneeId], references: [users.id] }),
  product: one(products, { fields: [conversations.productId], references: [products.id] }),
  messages: many(messages),
}));
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  user: one(users, { fields: [messages.userId], references: [users.id] }),
}));
export const serviceRelations = relations(serviceRecords, ({ one }) => ({
  customer: one(customers, { fields: [serviceRecords.customerId], references: [customers.id] }),
  assignee: one(users, { fields: [serviceRecords.assigneeId], references: [users.id] }),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));
export const questionsRelations = relations(productQuestions, ({ one }) => ({
  product: one(products, { fields: [productQuestions.productId], references: [products.id] }),
}));
export const alertsRelations = relations(stockAlerts, ({ one }) => ({
  product: one(products, { fields: [stockAlerts.productId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  campaign: one(campaigns, { fields: [orders.campaignId], references: [campaigns.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  returns: many(returnRequests),
}));
export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  serials: many(serialNumbers),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  user: one(users, { fields: [orderEvents.userId], references: [users.id] }),
}));
export const returnsRelations = relations(returnRequests, ({ one }) => ({
  order: one(orders, { fields: [returnRequests.orderId], references: [orders.id] }),
  customer: one(customers, { fields: [returnRequests.customerId], references: [customers.id] }),
}));
export const faqsRelations = relations(faqs, ({ one }) => ({
  product: one(products, { fields: [faqs.productId], references: [products.id] }),
  category: one(categories, { fields: [faqs.categoryId], references: [categories.id] }),
}));
export const campaignsRelations = relations(campaigns, ({ many }) => ({ orders: many(orders) }));
