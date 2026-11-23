import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentOrg } from "@/lib/org";
import { inr } from "@/lib/money";
import { AdvertiserForm } from "@/components/AdvertiserForm";

export const dynamic = "force-dynamic";

export default async function AdvertisersPage() {
  const org = await getCurrentOrg();
  const { advertisers, adBookings, invoices } = schema;
  const rows = await db
    .select({
      id: advertisers.id,
      businessName: advertisers.businessName,
      contactName: advertisers.contactName,
      phone: advertisers.phone,
      category: advertisers.category,
      address: advertisers.address,
      gstin: advertisers.gstin,
      bookings: sql<number>`(select count(*) from ${adBookings} where ${adBookings.advertiserId} = ${advertisers.id} and ${adBookings.status} <> 'cancelled')`,
      billed: sql<number>`coalesce((select sum(${invoices.amountInr}) from ${invoices} join ${adBookings} on ${adBookings.id} = ${invoices.bookingId} where ${adBookings.advertiserId} = ${advertisers.id}), 0)`,
      due: sql<number>`coalesce((select sum(${invoices.amountInr}) from ${invoices} join ${adBookings} on ${adBookings.id} = ${invoices.bookingId} where ${adBookings.advertiserId} = ${advertisers.id} and ${invoices.paidAt} is null), 0)`,
    })
    .from(advertisers)
    .where(eq(advertisers.orgId, org.id))
    .orderBy(asc(advertisers.businessName));

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
