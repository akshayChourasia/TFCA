/**
 * Data model. Every table carries `orgId` so one deployment can serve many
 * townships (TFCA is the first organisation). All queries go through
 * `src/db/scope.ts`, which always filters by the current organisation.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { BrandKit } from "@/lib/brand";

export type BillingDetails = {
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  upiId?: string;
  bankDetails?: string;
  /** Invoice numbers look like `${prefix}/${year}/001`. Defaults to the short name. */
  invoicePrefix?: string;
};
import type { Box } from "@/templates/types";

export const roleEnum = pgEnum("role", [
  "admin",
  "chief_editor",
  "editor",
  "proofreader",
  "designer",
  "ad_manager",
  "viewer",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "planning",
  "in_progress",
  "final",
  "published",
]);

export const pageStatusEnum = pgEnum("page_status", [
  "empty",
  "draft",
  "proofreading",
  "approved",
  "locked",
]);

export const pageModeEnum = pgEnum("page_mode", ["template", "free"]);

export const contentStatusEnum = pgEnum("content_status", [
  "received",
  "shortlisted",
  "editing",
  "proofreading",
  "approved",
  "placed",
  "rejected",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "lead",
  "contacted",
  "confirmed",
  "artwork_received",
  "artwork_approved",
  "paid",
  "cancelled",
]);

export const adSlotEnum = pgEnum("ad_slot", [
  "back_cover",
  "inside_front_cover",
  "inside_back_cover",
  "full",
  "half",
  "quarter",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  brand: jsonb("brand").$type<BrandKit>().notNull(),
  /** Shown on invoices and receipts. */
  billing: jsonb("billing").$type<BillingDetails>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Team members who log in (the core team). Residents are in `members`. */
export const teamUsers = pgTable(
  "team_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    role: roleEnum("role").notNull().default("editor"),
    creditTitle: text("credit_title"),
    creditQuote: text("credit_quote"),
    photoUrl: text("photo_url"),
    /** scrypt hash; null = cannot log in yet (credits-only entry). */
    passwordHash: text("password_hash"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("team_users_org_phone").on(t.orgId, t.phone)],
);

/** Login sessions. Only a SHA-256 of the cookie token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => teamUsers.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);

/** Residents: feeds the telephone directory and resident profiles. */
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit"),
    phone: text("phone"),
    profession: text("profession"),
    showInDirectory: boolean("show_in_directory").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("members_org").on(t.orgId)],
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    year: integer("year").notNull(),
    editionLabel: text("edition_label"),
    status: issueStatusEnum("status").notNull().default("planning"),
    trimWidthMm: integer("trim_width_mm").notNull().default(210),
    trimHeightMm: integer("trim_height_mm").notNull().default(297),
    bleedMm: integer("bleed_mm").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("issues_org").on(t.orgId)],
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    templateKey: text("template_key").notNull(),
    section: text("section"),
    mode: pageModeEnum("mode").notNull().default("template"),
    /** Field values for template mode (shape defined per template). */
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    /** Positioned boxes for free mode (snapshot of the template when unlocked). */
    boxes: jsonb("boxes").$type<Box[]>(),
    status: pageStatusEnum("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pages_issue").on(t.issueId, t.position)],
);

/** Articles, profiles, poems etc. coming in from the team (email/WhatsApp). */
export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    authorName: text("author_name"),
    category: text("category").notNull().default("article"),
    body: text("body").notNull().default(""),
    status: contentStatusEnum("status").notNull().default("received"),
    assigneeId: uuid("assignee_id").references(() => teamUsers.id, { onDelete: "set null" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_org").on(t.orgId)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    fileName: text("file_name").notNull(),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_org").on(t.orgId)],
);

export const advertisers = pgTable(
  "advertisers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    category: text("category"),
    address: text("address"),
    gstin: text("gstin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("advertisers_org").on(t.orgId)],
);

export const rateCard = pgTable(
  "rate_card",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    slot: adSlotEnum("slot").notNull(),
    priceInr: integer("price_inr").notNull(),
  },
  (t) => [uniqueIndex("rate_card_issue_slot").on(t.issueId, t.slot)],
);

export const adBookings = pgTable(
  "ad_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    advertiserId: uuid("advertiser_id").notNull().references(() => advertisers.id, { onDelete: "cascade" }),
    slot: adSlotEnum("slot").notNull(),
    priceInr: integer("price_inr").notNull(),
    status: bookingStatusEnum("status").notNull().default("lead"),
    artworkUrl: text("artwork_url"),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_issue").on(t.issueId)],
);

/** Invoices are issued in the portal; payment itself happens offline and is recorded here. */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").notNull().references(() => adBookings.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    amountInr: integer("amount_inr").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentMethod: text("payment_method"),
    paymentRef: text("payment_ref"),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("invoices_org_number").on(t.orgId, t.number)],
);
