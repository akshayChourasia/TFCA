"use server";

import { and, eq, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentOrg } from "@/lib/org";
import { PAYMENT_METHODS, SLOTS } from "@/lib/money";

const { advertisers, adBookings, rateCard, invoices, issues, pages } = schema;

const slotSchema = z.enum(SLOTS as [string, ...string[]]);
const statusSchema = z.enum(["lead", "contacted", "confirmed", "artwork_received", "artwork_approved", "paid", "cancelled"]);

async function ownedIssue(issueId: string) {
  const org = await getCurrentOrg();
  const issue = await db.query.issues.findFirst({ where: and(eq(issues.id, issueId), eq(issues.orgId, org.id)) });
  if (!issue) throw new Error("Issue not found");
  return { org, issue };
}

async function ownedBooking(bookingId: string) {
  const org = await getCurrentOrg();
  const booking = await db.query.adBookings.findFirst({
    where: and(eq(adBookings.id, bookingId), eq(adBookings.orgId, org.id)),
  });
  if (!booking) throw new Error("Booking not found");
  return { org, booking };
}

const revalidateAds = (issueId: string) => {
  revalidatePath(`/issues/${issueId}/ads`);
  revalidatePath(`/issues/${issueId}`);
  revalidatePath("/advertisers");
};

// ---------- Advertisers ----------

const advertiserSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  contactName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  category: z.string().trim().optional(),
  address: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
});

export async function saveAdvertiser(id: string | null, formData: FormData) {
  const org = await getCurrentOrg();
  const v = advertiserSchema.parse(Object.fromEntries(formData));
  const values = {
    businessName: v.businessName,
    contactName: v.contactName || null,
    phone: v.phone || null,
    category: v.category || null,
    address: v.address || null,
    gstin: v.gstin || null,
  };
  if (id) {
    await db.update(advertisers).set(values).where(and(eq(advertisers.id, id), eq(advertisers.orgId, org.id)));
  } else {
    await db.insert(advertisers).values({ orgId: org.id, ...values });
  }
  revalidatePath("/advertisers");
}

// ---------- Rate card ----------

export async function setRate(issueId: string, slot: string, priceInr: number) {
  const { org } = await ownedIssue(issueId);
  const s = slotSchema.parse(slot) as (typeof SLOTS)[number];
  const price = z.number().int().min(0).parse(priceInr);
  await db
    .insert(rateCard)
    .values({ orgId: org.id, issueId, slot: s, priceInr: price })
    .onConflictDoUpdate({ target: [rateCard.issueId, rateCard.slot], set: { priceInr: price } });
  revalidateAds(issueId);
}

// ---------- Bookings ----------

export async function createBooking(issueId: string, advertiserId: string, slot: string) {
  const { org } = await ownedIssue(issueId);
  const s = slotSchema.parse(slot) as (typeof SLOTS)[number];
  const adv = await db.query.advertisers.findFirst({
    where: and(eq(advertisers.id, advertiserId), eq(advertisers.orgId, org.id)),
  });
  if (!adv) throw new Error("Advertiser not found");
  const rate = await db.query.rateCard.findFirst({ where: and(eq(rateCard.issueId, issueId), eq(rateCard.slot, s)) });
  await db.insert(adBookings).values({
    orgId: org.id,
    issueId,
    advertiserId,
    slot: s,
    priceInr: rate?.priceInr ?? 0,
    status: "confirmed",
  });
  revalidateAds(issueId);
}

export async function updateBooking(
  bookingId: string,
  patch: { status?: string; priceInr?: number; artworkUrl?: string | null },
) {
  const { booking } = await ownedBooking(bookingId);
  const set: Partial<typeof adBookings.$inferInsert> = {};
  if (patch.status !== undefined) set.status = statusSchema.parse(patch.status);
  if (patch.priceInr !== undefined) set.priceInr = z.number().int().min(0).parse(patch.priceInr);
  if (patch.artworkUrl !== undefined) {
    set.artworkUrl = patch.artworkUrl || null;
    if (patch.artworkUrl && ["lead", "contacted", "confirmed"].includes(booking.status) && !patch.status) {
      set.status = "artwork_received";
    }
  }
  await db.update(adBookings).set(set).where(eq(adBookings.id, booking.id));
  if (patch.artworkUrl !== undefined && booking.pageId) await syncPageSlot(booking.pageId);
  revalidateAds(booking.issueId);
}

export async function deleteBooking(bookingId: string) {
  const { booking } = await ownedBooking(bookingId);
  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.bookingId, booking.id) });
  if (invoice) throw new Error("This booking has an invoice. Cancel the booking instead of deleting it.");
  await db.delete(adBookings).where(eq(adBookings.id, booking.id));
  if (booking.pageId) await syncPageSlot(booking.pageId);
  revalidateAds(booking.issueId);
}

/** Puts a booking on an ad page (or takes it off with `pageId = null`). */
export async function placeBooking(bookingId: string, pageId: string | null) {
  const { org, booking } = await ownedBooking(bookingId);
  if (pageId) {
    const page = await db.query.pages.findFirst({
      where: and(eq(pages.id, pageId), eq(pages.orgId, org.id), eq(pages.issueId, booking.issueId)),
    });
    if (!page || page.templateKey !== "ads") throw new Error("Choose an ad page");
  }
  const previous = booking.pageId;
  await db.update(adBookings).set({ pageId }).where(eq(adBookings.id, booking.id));
  if (previous) await syncPageSlot(previous);
  if (pageId) await syncPageSlot(pageId);
  revalidateAds(booking.issueId);
}

const LAYOUT_FOR_SLOTS: Record<number, string> = { 1: "full", 2: "halves", 3: "half-quarters", 4: "quarters" };

/**
 * Rebuilds an ad page's slots from the bookings placed on it, so the page
 * always shows the latest artwork. Hand-made slots that have artwork are kept.
 */
async function syncPageSlot(pageId: string) {
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page || page.templateKey !== "ads") return;
  const placed = await db.query.adBookings.findMany({
    where: eq(adBookings.pageId, pageId),
  });
  const advs = placed.length
    ? await db.query.advertisers.findMany({ where: eq(advertisers.orgId, page.orgId) })
    : [];
  const nameOf = (id: string) => advs.find((a) => a.id === id)?.businessName ?? "";

  type SlotData = { advertiser?: string; artwork?: string; bookingId?: string };
  const existing = (Array.isArray(page.data.slots) ? page.data.slots : []) as SlotData[];
  // Hand-made slots with artwork stay; name-only placeholders give way to real bookings.
  const manual = existing.filter((s) => !s.bookingId && s.artwork);
  // Bigger ads first so a half page takes the top of a half + quarters layout.
  const order = { back_cover: 0, inside_front_cover: 0, inside_back_cover: 0, full: 0, half: 1, quarter: 2 };
  const fromBookings: SlotData[] = placed
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => order[a.slot] - order[b.slot])
    .map((b) => ({ advertiser: nameOf(b.advertiserId), artwork: b.artworkUrl ?? "", bookingId: b.id }));
  const slots = [...fromBookings, ...manual].slice(0, 4);
  const layout = (page.data.layout as string) ?? LAYOUT_FOR_SLOTS[Math.max(1, slots.length)];
  const capacity = { full: 1, halves: 2, "half-quarters": 3, quarters: 4 }[layout] ?? 1;
  const nextLayout = slots.length > capacity ? LAYOUT_FOR_SLOTS[slots.length] : layout;
  await db
    .update(pages)
    .set({ data: { ...page.data, layout: nextLayout, slots }, updatedAt: new Date() })
    .where(eq(pages.id, pageId));
}

// ---------- Invoices ----------

export async function issueInvoice(bookingId: string) {
  const { org, booking } = await ownedBooking(bookingId);
  const existing = await db.query.invoices.findFirst({ where: eq(invoices.bookingId, booking.id) });
  if (existing) return existing.id;
  const issue = await db.query.issues.findFirst({ where: eq(issues.id, booking.issueId) });
  const prefix = `${org.billing.invoicePrefix || org.shortName}/${issue?.year ?? new Date().getFullYear()}/`;

  const id = await db.transaction(async (tx) => {
    // Serialise numbering per organisation.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${org.id}))`);
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)` })
      .from(invoices)
      .where(and(eq(invoices.orgId, org.id), like(invoices.number, `${prefix}%`)));
    const number = `${prefix}${String(Number(n) + 1).padStart(3, "0")}`;
    const [inv] = await tx
      .insert(invoices)
      .values({ orgId: org.id, bookingId: booking.id, number, amountInr: booking.priceInr })
      .returning();
    return inv.id;
  });
  revalidateAds(booking.issueId);
  return id;
}

export async function recordPayment(invoiceId: string, input: { method: string; ref: string; date: string }) {
  const org = await getCurrentOrg();
  const inv = await db.query.invoices.findFirst({ where: and(eq(invoices.id, invoiceId), eq(invoices.orgId, org.id)) });
  if (!inv) throw new Error("Invoice not found");
  const method = z.enum(PAYMENT_METHODS).parse(input.method);
  const paidAt = input.date ? new Date(`${input.date}T12:00:00+05:30`) : new Date();
  if (Number.isNaN(paidAt.getTime())) throw new Error("Invalid date");
  await db
    .update(invoices)
    .set({ paidAt, paymentMethod: method, paymentRef: input.ref.trim() || null })
    .where(eq(invoices.id, inv.id));
  const booking = await db.query.adBookings.findFirst({ where: eq(adBookings.id, inv.bookingId) });
  if (booking) {
    await db.update(adBookings).set({ status: "paid" }).where(eq(adBookings.id, booking.id));
    revalidateAds(booking.issueId);
  }
}

export async function undoPayment(invoiceId: string) {
  const org = await getCurrentOrg();
  const inv = await db.query.invoices.findFirst({ where: and(eq(invoices.id, invoiceId), eq(invoices.orgId, org.id)) });
  if (!inv) throw new Error("Invoice not found");
  await db.update(invoices).set({ paidAt: null, paymentMethod: null, paymentRef: null }).where(eq(invoices.id, inv.id));
  const booking = await db.query.adBookings.findFirst({ where: eq(adBookings.id, inv.bookingId) });
  if (booking) {
    const status = booking.artworkUrl ? "artwork_received" : "confirmed";
    await db.update(adBookings).set({ status }).where(eq(adBookings.id, booking.id));
    revalidateAds(booking.issueId);
  }
}
