import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { can, type Permission, type Role } from "./roles";

export const SESSION_COOKIE = "mag_session";
const SESSION_DAYS = 30;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string, orgId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id: hashToken(token), userId, orgId, expiresAt });
  // Opportunistic cleanup of expired sessions.
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** Ends every session of a user (after a password reset or deactivation). */
export async function destroyUserSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export type CurrentUser = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  mustChangePassword: boolean;
  org: typeof schema.organizations.$inferSelect;
};

/** The logged-in team member, or null. Cached for the request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.query.sessions.findFirst({
    where: and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, new Date())),
  });
  if (!session) return null;
  const user = await db.query.teamUsers.findFirst({
    where: and(eq(schema.teamUsers.id, session.userId), eq(schema.teamUsers.active, true)),
  });
  if (!user) return null;
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, session.orgId) });
  if (!org) return null;
  return { id: user.id, name: user.name, phone: user.phone, role: user.role, mustChangePassword: user.mustChangePassword, org };
});

/** For pages: sends visitors without a session to the login page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions and API routes: throws unless the user has the permission. */
export async function requirePermission(p: Permission) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please log in again.");
  if (user.mustChangePassword) throw new Error("Please set a new password first.");
  if (!can(user.role, p)) throw new Error("Your role does not allow this.");
  return user;
}

// ---- Login throttling (per process): 5 failures per phone per 15 minutes ----
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;

export function loginBlocked(phone: string) {
  const f = failures.get(phone);
  return !!f && f.count >= 5 && f.until > Date.now();
}
export function recordLoginFailure(phone: string) {
  const f = failures.get(phone);
  if (!f || f.until < Date.now()) failures.set(phone, { count: 1, until: Date.now() + WINDOW_MS });
  else f.count += 1;
}
export function clearLoginFailures(phone: string) {
  failures.delete(phone);
}
