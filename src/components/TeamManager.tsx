"use client";

import { useActionState, useState, useTransition } from "react";
import { addMember, resetPassword, setActive, setRole } from "@/app/(studio)/team-actions";

type RoleOption = { value: string; label: string };

/** Shows a temporary password once, with a WhatsApp-ready message. */
function TempPassword({ name, password, phone }: { name: string; password: string; phone?: string }) {
  const text = `Namaste ${name}, your Magazine Studio login: mobile ${phone ?? "(your number)"}, temporary password ${password}. You'll set your own password after logging in.`;
  return (
    <div className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm">
      <div>
        Temporary password for <strong>{name}</strong>: <code className="rounded bg-white px-1.5 py-0.5 text-base">{password}</code>
      </div>
      <div className="mt-1 text-emerald-900">Share it with them now. It is shown only once.</div>
      {phone && (
        <a
          className="mt-2 inline-block text-emerald-800 underline"
          target="_blank"
          rel="noreferrer"
          href={`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`}
        >
          Send on WhatsApp
        </a>
      )}
    </div>
  );
}

export function AddMemberForm({ roles }: { roles: RoleOption[] }) {
  const [state, action, pending] = useActionState(addMember, undefined);
  const [phone, setPhone] = useState("");
  const input = "mt-1 block w-full rounded border px-2 py-1.5";
  return (
    <form action={action} className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <label>
        Name
        <input name="name" required className={input} />
      </label>
      <label>
        Mobile number
        <input name="phone" required inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
      </label>
      <label>
        Role
        <select name="role" defaultValue="editor" className={input}>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </label>
      <label>
        Credit on the team page (optional)
        <input name="creditTitle" placeholder="Content & Editing" className={input} />
      </label>
      <div className="sm:col-span-2">
        <button disabled={pending} className="rounded bg-[#1d2b4f] px-4 py-2 font-semibold text-white disabled:opacity-50">
          {pending ? "Adding…" : "Add and create login"}
        </button>
        {state?.error && <div className="mt-2 text-rose-700">{state.error}</div>}
        {state?.password && state.name && (
          <TempPassword name={state.name} password={state.password} phone={phone.replace(/\D/g, "").slice(-10)} />
        )}
      </div>
    </form>
  );
}

export function MemberRow({
  member,
  roles,
}: {
  member: {
    id: string;
    name: string;
    phone: string;
    role: string;
    active: boolean;
    hasPassword: boolean;
    mustChangePassword: boolean;
    isMe: boolean;
  };
  roles: RoleOption[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  const loginLabel = !member.active
    ? "Deactivated"
    : !member.hasPassword
      ? "No login"
      : member.mustChangePassword
        ? "Waiting for first login"
        : "Active";

  return (
    <tr className={`align-top ${pending ? "opacity-60" : ""} ${member.active ? "" : "text-neutral-400"}`}>
      <td className="px-4 py-2 font-medium">
        {member.name}
        {member.isMe && <span className="ml-2 text-xs text-neutral-500">(you)</span>}
        {error && <div className="text-xs text-rose-700">{error}</div>}
        {temp && <TempPassword name={member.name} password={temp} phone={member.phone} />}
      </td>
      <td className="px-4 py-2">{member.phone}</td>
      <td className="px-4 py-2">
        <select
          value={member.role}
          disabled={pending}
          onChange={(e) => run(() => setRole(member.id, e.target.value))}
          className="rounded border px-2 py-1"
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">{loginLabel}</td>
      <td className="px-4 py-2 whitespace-nowrap text-xs">
        {member.active && (
          <button
            className="text-[#1f5fa8] underline"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const r = await resetPassword(member.id);
                setTemp(r.password ?? null);
              })
            }
          >
            {member.hasPassword ? "Reset password" : "Create login"}
          </button>
        )}
        {!member.isMe && (
          <button
            className={`ml-3 underline ${member.active ? "text-rose-700" : "text-emerald-700"}`}
            disabled={pending}
            onClick={() => run(() => setActive(member.id, !member.active))}
          >
            {member.active ? "Deactivate" : "Reactivate"}
          </button>
        )}
      </td>
    </tr>
  );
}
