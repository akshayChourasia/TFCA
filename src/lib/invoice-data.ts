import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Loads an invoice with its booking, advertiser, issue and organisation. Scoped to `orgId`. */
export async function loadInvoice(orgId: string, invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.orgId, orgId)),
  });
  if (!invoice) return null;
  const booking = await db.query.adBookings.findFirst({ where: eq(schema.adBookings.id, invoice.bookingId) });
  if (!booking) return null;
  const [advertiser, issue, org] = await Promise.all([
    db.query.advertisers.findFirst({ where: eq(schema.advertisers.id, booking.advertiserId) }),
    db.query.issues.findFirst({ where: eq(schema.issues.id, booking.issueId) }),
    db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) }),
  ]);
  if (!advertiser || !issue || !org) return null;
  return { invoice, booking, advertiser, issue, org };
}

export type LoadedInvoice = NonNullable<Awaited<ReturnType<typeof loadInvoice>>>;
