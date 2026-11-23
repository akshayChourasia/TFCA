"use client";

import { useState, useTransition } from "react";
import { recordPayment, undoPayment } from "@/app/(studio)/ads-actions";
import { PAYMENT_METHODS } from "@/lib/money";

/** Payment happens offline; the team records it here, which turns the invoice into a receipt. */
export function PaymentForm({ invoiceId, paid }: { invoiceId: string; paid: boolean }) {
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (paid) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm">
        <div className="font-semibold">Payment recorded</div>
        <button
          className="mt-2 text-rose-700 underline disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            if (confirm("Mark this invoice as unpaid again?")) start(() => undoPayment(invoiceId));
          }}
        >
          Undo payment
        </button>
      </div>
    );
  }
  return (
    <form
      className="rounded-lg border bg-white p-4 text-sm space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          try {
            await recordPayment(invoiceId, { method, ref, date });
          } catch (err) {
            setError(String(err));
          }
        });
      }}
    >
      <div className="font-semibold">Record payment</div>
      <label className="block">
        Method
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1.5">
          {PAYMENT_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="block">
        Reference (UPI ref, cheque no.)
        <input value={ref} onChange={(e) => setRef(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1.5" />
      </label>
      <label className="block">
        Date received
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1.5" />
      </label>
      <button disabled={pending} className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Mark as paid"}
      </button>
      {error && <div className="text-rose-700">{error}</div>}
    </form>
  );
}
