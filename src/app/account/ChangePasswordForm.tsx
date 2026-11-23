"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword } from "@/app/auth-actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const input = "mt-1 block w-full rounded border px-3 py-2";
  if (state?.ok) {
    return (
      <div className="mt-6 space-y-3 text-sm">
        <div className="rounded bg-emerald-50 px-3 py-2 text-emerald-800">{state.ok}</div>
        <Link href="/issues" className="inline-block rounded bg-[#1d2b4f] px-4 py-2 font-semibold text-white">Continue</Link>
      </div>
    );
  }
  return (
    <form action={action} className="mt-6 space-y-4 text-sm">
      <label className="block">
        Current password
        <input name="current" type="password" autoComplete="current-password" required className={input} />
      </label>
      <label className="block">
        New password (at least 8 characters)
        <input name="next" type="password" autoComplete="new-password" minLength={8} required className={input} />
      </label>
      <label className="block">
        New password again
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={input} />
      </label>
      {state?.error && <div className="rounded bg-rose-50 px-3 py-2 text-rose-800">{state.error}</div>}
      <button disabled={pending} className="w-full rounded bg-[#8b1e2d] px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
