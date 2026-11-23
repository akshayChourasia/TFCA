import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentOrg } from "@/lib/org";
import { loadIssue } from "@/lib/issue-data";
import { SLOTS, SLOT_LABELS, inr } from "@/lib/money";
import { RateCardEditor, NewBookingForm, BookingsTable, type BookingRow } from "@/components/AdsManager";

export const dynamic = "force-dynamic";

export default async function AdsPage(props: PageProps<"/issues/[issueId]/ads">) {
  const { issueId } = await props.params;
  const org = await getCurrentOrg();
  const loaded = await loadIssue(org.id, issueId);
  if (!loaded) notFound();
  const { issue, pages } = loaded;

  const [rates, advertisers, bookings, invoices] = await Promise.all([
    db.query.rateCard.findMany({ where: eq(schema.rateCard.issueId, issueId) }),
    db.query.advertisers.findMany({ where: eq(schema.advertisers.orgId, org.id), orderBy: asc(schema.advertisers.businessName) }),
    db.query.adBookings.findMany({
      where: and(eq(schema.adBookings.issueId, issueId), eq(schema.adBookings.orgId, org.id)),
      orderBy: asc(schema.adBookings.createdAt),
    }),
    db.query.invoices.findMany({ where: eq(schema.invoices.orgId, org.id) }),
  ]);

  const rows: BookingRow[] = bookings.map((b) => {
    const inv = invoices.find((i) => i.bookingId === b.id);
    return {
      id: b.id,
      advertiser: advertisers.find((a) => a.id === b.advertiserId)?.businessName ?? "?",
      slot: b.slot,
      priceInr: b.priceInr,
      status: b.status,
      artworkUrl: b.artworkUrl,
      pageId: b.pageId,
      invoice: inv ? { id: inv.id, number: inv.number, paid: !!inv.paidAt } : null,
    };
  });

  const live = rows.filter((r) => r.status !== "cancelled");
  const invoiced = invoices.filter((i) => live.some((r) => r.invoice?.id === i.id));
  const received = invoiced.filter((i) => i.paidAt).reduce((s, i) => s + i.amountInr, 0);
  const billed = invoiced.reduce((s, i) => s + i.amountInr, 0);
  const booked = live.reduce((s, r) => s + r.priceInr, 0);
  const adPages = pages.filter((p) => p.templateKey === "ads").map((p) => ({ id: p.id, label: `Page ${p.pageNumber}` }));

  return (
    <div className="p-8 max-w-6xl">
      <Link href={`/issues/${issue.id}`} className="text-sm text-neutral-500 hover:underline">← Flatplan</Link>
      <h1 className="text-2xl font-semibold mt-1">
        Ads & invoices · {issue.title} {issue.year}
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Booked", inr(booked), `${live.length} ads`],
          ["Invoiced", inr(billed), `${invoiced.length} invoices`],
          ["Received", inr(received), "recorded payments"],
          ["Outstanding", inr(billed - received), "invoiced, not paid"],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-lg border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
            <div className={`text-xl font-semibold ${label === "Outstanding" && billed - received > 0 ? "text-rose-700" : ""}`}>{value}</div>
            <div className="text-xs text-neutral-500">{sub}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-semibold">Rate card</h2>
        <RateCardEditor
          issueId={issue.id}
          rates={SLOTS.map((s) => ({ slot: s, label: SLOT_LABELS[s], priceInr: rates.find((r) => r.slot === s)?.priceInr ?? null }))}
        />
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Bookings</h2>
        <NewBookingForm
          issueId={issue.id}
          advertisers={advertisers.map((a) => ({ id: a.id, name: a.businessName }))}
          slots={SLOTS.map((s) => ({ slot: s, label: SLOT_LABELS[s] }))}
        />
        <BookingsTable rows={rows} adPages={adPages} />
        {adPages.length === 0 && (
          <p className="mt-2 text-sm text-amber-800">Add an &ldquo;Ad page&rdquo; in the flatplan to place booked ads on it.</p>
        )}
      </section>
    </div>
  );
}
