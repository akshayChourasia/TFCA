import { and, asc, count, eq, ne, sql, sum } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { inr } from "@/lib/money";
import { AdvertiserForm } from "@/components/AdvertiserForm";

export const dynamic = "force-dynamic";

export default async function AdvertisersPage() {
  const user = await requireUser();
  if (!can(user.role, "ads.manage")) return <div className="p-8 text-neutral-600">Only admins and ad managers can see advertisers and invoices.</div>;
  const org = user.org;
  const { advertisers, adBookings, invoices } = schema;
  const list = await db
    .select()
    .from(advertisers)
    .where(eq(advertisers.orgId, org.id))
    .orderBy(asc(advertisers.businessName));
  // Totals per advertiser (bookings that aren't cancelled; billed and unpaid invoice amounts).
  const bookingCounts = await db
    .select({ advertiserId: adBookings.advertiserId, n: count() })
    .from(adBookings)
    .where(and(eq(adBookings.orgId, org.id), ne(adBookings.status, "cancelled")))
    .groupBy(adBookings.advertiserId);
  const money = await db
    .select({
      advertiserId: adBookings.advertiserId,
      billed: sum(invoices.amountInr),
      due: sql<string>`coalesce(sum(${invoices.amountInr}) filter (where ${invoices.paidAt} is null), 0)`,
    })
    .from(invoices)
    .innerJoin(adBookings, eq(adBookings.id, invoices.bookingId))
    .where(eq(invoices.orgId, org.id))
    .groupBy(adBookings.advertiserId);
  const rows = list.map((a) => {
    const m = money.find((x) => x.advertiserId === a.id);
    return {
      ...a,
      bookings: bookingCounts.find((x) => x.advertiserId === a.id)?.n ?? 0,
      billed: Number(m?.billed ?? 0),
      due: Number(m?.due ?? 0),
    };
  });

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">Advertisers</h1>
      <p className="text-sm text-neutral-600 mt-1">
        Every business that has advertised or might. Book ads and issue invoices from an issue&apos;s <em>Ads & invoices</em> page.
      </p>
      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-2">Business</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Ads</th>
              <th className="px-4 py-2 text-right">Billed</th>
              <th className="px-4 py-2 text-right">Due</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-2 font-medium">{r.businessName}</td>
                <td className="px-4 py-2">
                  {r.contactName}
                  <div className="text-neutral-500">{r.phone}</div>
                </td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2 text-right">{Number(r.bookings)}</td>
                <td className="px-4 py-2 text-right">{inr(Number(r.billed))}</td>
                <td className={`px-4 py-2 text-right ${Number(r.due) > 0 ? "text-rose-700 font-semibold" : ""}`}>{inr(Number(r.due))}</td>
                <td className="px-4 py-2">
                  <details>
                    <summary className="cursor-pointer text-[#1f5fa8]">Edit</summary>
                    <div className="mt-2 w-80">
                      <AdvertiserForm advertiser={r} />
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-neutral-500">No advertisers yet. Add the first one below.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-8 max-w-xl rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Add advertiser</h2>
        <AdvertiserForm advertiser={null} />
      </div>
    </div>
  );
}
