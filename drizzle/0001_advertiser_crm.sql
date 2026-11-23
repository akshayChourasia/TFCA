ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing" jsonb DEFAULT '{}'::jsonb NOT NULL;