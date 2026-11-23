"use client";

import { useActionState } from "react";
import { login } from "@/app/auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 space-y-4 text-sm">
      <label className="block">
        Mobile number
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          required
          placeholder="98xxxxxxxx"
          className="mt-1 block w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="mt-1 block w-full rounded border px-3 py-2" />
      </label>
      {state?.error && <div className="rounded bg-rose-50 px-3 py-2 text-rose-800">{state.error}</div>}
      <button disabled={pending} className="w-full rounded bg-[#8b1e2d] px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="text-xs text-neutral-500">Forgot your password? Ask your admin to reset it.</p>
    </form>
  );
}
