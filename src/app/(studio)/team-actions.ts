"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { destroyUserSessions, requirePermission } from "@/lib/auth";
import { hashPassword, normalizePhone, tempPassword } from "@/lib/password";
import { ROLES, type Role } from "@/lib/roles";

const { teamUsers } = schema;
const roleSchema = z.enum(ROLES as [Role, ...Role[]]);

async function ownedMember(id: string) {
  const admin = await requirePermission("team.manage");
  const member = await db.query.teamUsers.findFirst({ where: and(eq(teamUsers.id, id), eq(teamUsers.orgId, admin.org.id)) });
  if (!member) throw new Error("Team member not found");
  return { admin, member };
}

/** Refuses a change that would leave the township without an active admin. */
async function assertAnotherAdmin(orgId: string, exceptId: string) {
  const others = await db.query.teamUsers.findMany({
    where: and(eq(teamUsers.orgId, orgId), eq(teamUsers.role, "admin"), eq(teamUsers.active, true), ne(teamUsers.id, exceptId)),
  });
  if (others.length === 0) throw new Error("Keep at least one active admin.");
}

export type TeamResult = { error?: string; password?: string; name?: string };

export async function addMember(_prev: TeamResult | undefined, formData: FormData): Promise<TeamResult> {
  try {
    const admin = await requirePermission("team.manage");
    const v = z
      .object({
        name: z.string().trim().min(1, "Name is required"),
        phone: z.string().transform(normalizePhone).refine((p) => p.length === 10, "Enter a 10-digit mobile number"),
        role: roleSchema,
        creditTitle: z.string().trim().optional(),
      })
      .parse(Object.fromEntries(formData));
    const exists = await db.query.teamUsers.findFirst({
      where: and(eq(teamUsers.orgId, admin.org.id), eq(teamUsers.phone, v.phone)),
    });
    if (exists) return { error: `${v.phone} is already on the team (${exists.name}).` };
    const password = tempPassword();
    await db.insert(teamUsers).values({
      orgId: admin.org.id,
      name: v.name,
      phone: v.phone,
      role: v.role,
      creditTitle: v.creditTitle || null,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    });
    revalidatePath("/team");
    return { password, name: v.name };
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0]?.message : (e as Error).message };
  }
}

/** Sets a new temporary password and signs the member out everywhere. */
export async function resetPassword(id: string): Promise<TeamResult> {
  const { member } = await ownedMember(id);
  const password = tempPassword();
  await db
    .update(teamUsers)
    .set({ passwordHash: await hashPassword(password), mustChangePassword: true })
    .where(eq(teamUsers.id, member.id));
  await destroyUserSessions(member.id);
  revalidatePath("/team");
  return { password, name: member.name };
}

export async function setRole(id: string, role: string) {
  const { admin, member } = await ownedMember(id);
  const r = roleSchema.parse(role);
  if (member.role === "admin" && r !== "admin") await assertAnotherAdmin(admin.org.id, member.id);
  await db.update(teamUsers).set({ role: r }).where(eq(teamUsers.id, member.id));
  revalidatePath("/team");
}

export async function setActive(id: string, active: boolean) {
  const { admin, member } = await ownedMember(id);
  if (!active && member.role === "admin") await assertAnotherAdmin(admin.org.id, member.id);
  await db.update(teamUsers).set({ active }).where(eq(teamUsers.id, member.id));
  if (!active) await destroyUserSessions(member.id);
  revalidatePath("/team");
}
