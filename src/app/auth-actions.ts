"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import {
  clearLoginFailures,
  createSession,
  destroySession,
  destroyUserSessions,
  getCurrentUser,
  loginBlocked,
  recordLoginFailure,
} from "@/lib/auth";
import { MIN_PASSWORD, hashPassword, normalizePhone, verifyPassword } from "@/lib/password";

export type FormState = { error?: string; ok?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (phone.length !== 10 || !password) return { error: "Enter your 10-digit mobile number and password." };
  if (loginBlocked(phone)) return { error: "Too many wrong attempts. Try again in 15 minutes or ask your admin." };

  // A phone number may belong to team members of more than one township.
  const candidates = await db.query.teamUsers.findMany({ where: eq(schema.teamUsers.phone, phone) });
  let match: (typeof candidates)[number] | undefined;
  for (const c of candidates) {
    if (c.active && (await verifyPassword(password, c.passwordHash))) {
      match = c;
      break;
    }
  }
  if (!match) {
    recordLoginFailure(phone);
    return { error: "Wrong mobile number or password." };
  }
  clearLoginFailures(phone);
  await createSession(match.id, match.orgId);
  redirect(match.mustChangePassword ? "/account?first=1" : "/issues");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const row = await db.query.teamUsers.findFirst({ where: eq(schema.teamUsers.id, user.id) });
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { error: "Your current password is not correct." };
  if (next.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };
  if (next !== confirm) return { error: "The two new passwords do not match." };
  if (next === current) return { error: "Choose a password different from the current one." };
  await db
    .update(schema.teamUsers)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false })
    .where(eq(schema.teamUsers.id, user.id));
  // Sign out other devices, keep this one.
  await destroyUserSessions(user.id);
  await createSession(user.id, user.org.id);
  return { ok: "Password changed." };
}
