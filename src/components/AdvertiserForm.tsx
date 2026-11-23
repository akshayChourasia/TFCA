"use client";

import { useRef, useState, useTransition } from "react";
import { saveAdvertiser } from "@/app/(studio)/ads-actions";

type Advertiser = {
  id: string;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  category: string | null;
  address: string | null;
  gstin: string | null;
};

export function AdvertiserForm({ advertiser }: { advertiser: Advertiser | null }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const input = "mt-1 block w-full rounded border px-2 py-1.5";
  return (
    <form
      ref={form}
      className="mt-3 grid gap-3 text-sm sm:grid-cols-2"
      action={(fd) =>
        start(async () => {
          setMsg(null);
          try {
            await saveAdvertiser(advertiser?.id ?? null, fd);
            if (!advertiser) form.current?.reset();
            setMsg("Saved");
          } catch (e) {
            setMsg(String(e));
          }
        })
      }
    >
      <label className="sm:col-span-2">
        Business name
        <input name="businessName" required defaultValue={advertiser?.businessName} className={input} />
      </label>
      <label>
        Contact person
        <input name="contactName" defaultValue={advertiser?.contactName ?? ""} className={input} />
      </label>
      <label>
        Phone (WhatsApp)
        <input name="phone" defaultValue={advertiser?.phone ?? ""} className={input} />
      </label>
      <label>
        Category
        <input name="category" placeholder="Builder, health, education…" defaultValue={advertiser?.category ?? ""} className={input} />
      </label>
      <label>
        GSTIN (optional)
        <input name="gstin" defaultValue={advertiser?.gstin ?? ""} className={input} />
      </label>
      <label className="sm:col-span-2">
        Address
        <textarea name="address" rows={2} defaultValue={advertiser?.address ?? ""} className={input} />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button disabled={pending} className="rounded bg-[#1d2b4f] px-4 py-2 font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : advertiser ? "Save" : "Add advertiser"}
        </button>
        {msg && <span className="text-neutral-600">{msg}</span>}
      </div>
    </form>
  );
}
