"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBooking,
  deleteBooking,
  issueInvoice,
  placeBooking,
  setRate,
  updateBooking,
} from "@/app/(studio)/ads-actions";
import { BOOKING_STATUS_LABELS, SLOT_LABELS, inr, type BookingStatus, type Slot } from "@/lib/money";

export type BookingRow = {
  id: string;
  advertiser: string;
  slot: Slot;
  priceInr: number;
  status: BookingStatus;
  artworkUrl: string | null;
  pageId: string | null;
  invoice: { id: string; number: string; paid: boolean } | null;
};

export function RateCardEditor({
  issueId,
  rates,
}: {
  issueId: string;
  rates: { slot: Slot; label: string; priceInr: number | null }[];
}) {
  const [pending, start] = useTransition();
  return (
    <div className={`mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 ${pending ? "opacity-60" : ""}`}>
      {rates.map((r) => (
        <label key={r.slot} className="rounded-lg border bg-white p-3 text-sm">
          {r.label}
          <div className="mt-1 flex items-center gap-1">
            <span className="text-neutral-500">₹</span>
            <input
              type="number"
              min={0}
              step={500}
              defaultValue={r.priceInr ?? ""}
              placeholder="—"
              className="w-full rounded border px-2 py-1"
              onBlur={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (v !== null && v !== r.priceInr) start(() => setRate(issueId, r.slot, v));
              }}
            />
          </div>
        </label>
      ))}
    </div>
  );
}

export function NewBookingForm({
  issueId,
  advertisers,
  slots,
}: {
  issueId: string;
  advertisers: { id: string; name: string }[];
  slots: { slot: Slot; label: string }[];
}) {
  const [adv, setAdv] = useState(advertisers[0]?.id ?? "");
  const [slot, setSlot] = useState<Slot>("full");
  const [pending, start] = useTransition();
  if (advertisers.length === 0) {
    return (
      <p className="mt-2 text-sm">
        No advertisers yet. <Link className="text-[#1f5fa8] underline" href="/advertisers">Add advertisers</Link> first.
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm">
      <label>
        Advertiser
        <select value={adv} onChange={(e) => setAdv(e.target.value)} className="mt-1 block rounded border px-2 py-1.5">
          {advertisers.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
      <label>
        Size
        <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)} className="mt-1 block rounded border px-2 py-1.5">
          {slots.map((s) => (
            <option key={s.slot} value={s.slot}>{s.label}</option>
          ))}
        </select>
      </label>
      <button
        disabled={pending || !adv}
        onClick={() => start(() => createBooking(issueId, adv, slot))}
        className="rounded bg-[#1d2b4f] px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Booking…" : "Book ad"}
      </button>
      <span className="text-neutral-500">Price comes from the rate card and can be changed per booking.</span>
    </div>
  );
}

export function BookingsTable({ rows, adPages }: { rows: BookingRow[]; adPages: { id: string; label: string }[] }) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-neutral-500">No bookings yet.</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-3 py-2">Advertiser</th>
            <th className="px-3 py-2">Size</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Artwork</th>
            <th className="px-3 py-2">Page</th>
            <th className="px-3 py-2">Invoice</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <BookingRowView key={r.id} row={r} adPages={adPages} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingRowView({ row, adPages }: { row: BookingRow; adPages: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(String(e).replace(/^Error: /, ""));
      }
    });

  return (
    <tr className={`align-top ${pending ? "opacity-60" : ""} ${row.status === "cancelled" ? "text-neutral-400 line-through" : ""}`}>
      <td className="px-3 py-2 font-medium">
        {row.advertiser}
        {error && <div className="text-xs text-rose-700 no-underline">{error}</div>}
      </td>
      <td className="px-3 py-2">{SLOT_LABELS[row.slot]}</td>
      <td className="px-3 py-2">
        {row.invoice ? (
          inr(row.priceInr)
        ) : (
          <input
            type="number"
            min={0}
            defaultValue={row.priceInr}
            className="w-24 rounded border px-2 py-1"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== row.priceInr) run(() => updateBooking(row.id, { priceInr: v }));
            }}
          />
        )}
      </td>
      <td className="px-3 py-2">
        <select
          value={row.status}
          onChange={(e) => run(() => updateBooking(row.id, { status: e.target.value }))}
          className="rounded border px-2 py-1"
        >
          {Object.entries(BOOKING_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {row.artworkUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.artworkUrl} alt="" className="h-10 w-8 object-cover border" />
          )}
          <label className="cursor-pointer text-[#1f5fa8]">
            {row.artworkUrl ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                run(async () => {
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/uploads", { method: "POST", body: fd });
                  if (!res.ok) throw new Error(((await res.json()) as { error: string }).error);
                  const { url } = (await res.json()) as { url: string };
                  await updateBooking(row.id, { artworkUrl: url });
                });
              }}
            />
          </label>
        </div>
      </td>
      <td className="px-3 py-2">
        <select
          value={row.pageId ?? ""}
          onChange={(e) => run(() => placeBooking(row.id, e.target.value || null))}
          className="rounded border px-2 py-1"
        >
          <option value="">Not placed</option>
          {adPages.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {row.invoice ? (
          <Link href={`/invoices/${row.invoice.id}`} className="text-[#1f5fa8] underline">
            {row.invoice.number}
          </Link>
        ) : (
          <button
            disabled={row.status === "cancelled" || row.priceInr <= 0}
            onClick={() =>
              run(async () => {
                const id = await issueInvoice(row.id);
                router.push(`/invoices/${id}`);
              })
            }
            className="rounded border border-[#8b1e2d] px-2 py-1 text-[#8b1e2d] disabled:opacity-40"
            title={row.priceInr <= 0 ? "Set a price first" : undefined}
          >
            Create invoice
          </button>
        )}
        {row.invoice && (
          <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${row.invoice.paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
            {row.invoice.paid ? "paid" : "due"}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        {!row.invoice && (
          <button
            className="text-xs text-rose-700"
            onClick={() => {
              if (confirm("Delete this booking?")) run(() => deleteBooking(row.id));
            }}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}
