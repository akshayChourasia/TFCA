CREATE TYPE "public"."ad_slot" AS ENUM('back_cover', 'inside_front_cover', 'inside_back_cover', 'full', 'half', 'quarter');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('lead', 'contacted', 'confirmed', 'artwork_received', 'artwork_approved', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('received', 'shortlisted', 'editing', 'proofreading', 'approved', 'placed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('planning', 'in_progress', 'final', 'published');--> statement-breakpoint
CREATE TYPE "public"."page_mode" AS ENUM('template', 'free');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('empty', 'draft', 'proofreading', 'approved', 'locked');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'chief_editor', 'editor', 'proofreader', 'designer', 'ad_manager', 'viewer');--> statement-breakpoint
CREATE TABLE "ad_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"advertiser_id" uuid NOT NULL,
	"slot" "ad_slot" NOT NULL,
	"price_inr" integer NOT NULL,
	"status" "booking_status" DEFAULT 'lead' NOT NULL,
	"artwork_url" text,
	"page_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertisers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"category" text,
	"address" text,
	"gstin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"issue_id" uuid,
	"title" text NOT NULL,
	"author_name" text,
	"category" text DEFAULT 'article' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "content_status" DEFAULT 'received' NOT NULL,
	"assignee_id" uuid,
	"page_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"number" text NOT NULL,
	"amount_inr" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" text,
	"payment_ref" text
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"year" integer NOT NULL,
	"edition_label" text,
	"status" "issue_status" DEFAULT 'planning' NOT NULL,
	"trim_width_mm" integer DEFAULT 210 NOT NULL,
	"trim_height_mm" integer DEFAULT 297 NOT NULL,
	"bleed_mm" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"url" text NOT NULL,
	"file_name" text NOT NULL,
	"width_px" integer,
	"height_px" integer,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"phone" text,
	"profession" text,
	"show_in_directory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"brand" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"template_key" text NOT NULL,
	"section" text,
	"mode" "page_mode" DEFAULT 'template' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"boxes" jsonb,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"slot" "ad_slot" NOT NULL,
	"price_inr" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"role" "role" DEFAULT 'editor' NOT NULL,
	"credit_title" text,
	"credit_quote" text,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisers" ADD CONSTRAINT "advertisers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_assignee_id_team_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."team_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_ad_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."ad_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_card" ADD CONSTRAINT "rate_card_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_card" ADD CONSTRAINT "rate_card_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_issue" ON "ad_bookings" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "advertisers_org" ON "advertisers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "content_org" ON "content_items" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_org_number" ON "invoices" USING btree ("org_id","number");--> statement-breakpoint
CREATE INDEX "issues_org" ON "issues" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "media_org" ON "media_assets" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "members_org" ON "members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "pages_issue" ON "pages" USING btree ("issue_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_card_issue_slot" ON "rate_card" USING btree ("issue_id","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "team_users_org_phone" ON "team_users" USING btree ("org_id","phone");