"use server";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentOrg } from "@/lib/org";
import { TEMPLATES, templateByKey } from "@/templates";

const { issues, pages } = schema;

/** Reads a page and checks it belongs to the current organisation. */
async function ownedPage(pageId: string) {
  const org = await getCurrentOrg();
  const page = await db.query.pages.findFirst({ where: and(eq(pages.id, pageId), eq(pages.orgId, org.id)) });
  if (!page) throw new Error("Page not found");
  return { org, page };
}

/** Rewrites positions 0..n-1 in the current order. */
async function renumber(issueId: string) {
  const rows = await db.query.pages.findMany({ where: eq(pages.issueId, issueId), orderBy: asc(pages.position) });
  await db.transaction(async (tx) => {
    for (const [i, r] of rows.entries()) {
      if (r.position !== i) await tx.update(pages).set({ position: i }).where(eq(pages.id, r.id));
    }
  });
}

export async function createIssue(formData: FormData) {
  const org = await getCurrentOrg();
  const input = z
    .object({ title: z.string().min(1), year: z.coerce.number().int().min(2000).max(2100), editionLabel: z.string().optional() })
    .parse(Object.fromEntries(formData));
  const [issue] = await db
    .insert(issues)
    .values({ orgId: org.id, title: input.title, year: input.year, editionLabel: input.editionLabel || null })
    .returning();

  // Start with the skeleton of a typical issue: cover, contents, team, then 1 story page.
  const starter = ["cover", "contents", "team", "story"];
  await db.insert(pages).values(
    starter.map((key, i) => ({
      orgId: org.id,
      issueId: issue.id,
      position: i,
      templateKey: key,
      data: {},
      status: "draft" as const,
    })),
  );
  redirect(`/issues/${issue.id}`);
}

export async function addPage(issueId: string, templateKey: string, afterPosition: number | null) {
  const org = await getCurrentOrg();
  if (!TEMPLATES.some((t) => t.key === templateKey)) throw new Error("Unknown template");
  const issue = await db.query.issues.findFirst({ where: and(eq(issues.id, issueId), eq(issues.orgId, org.id)) });
  if (!issue) throw new Error("Issue not found");

  let position: number;
  if (afterPosition === null) {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${pages.position}), -1)` })
      .from(pages)
      .where(eq(pages.issueId, issueId));
    position = Number(max) + 1;
  } else {
    position = afterPosition + 1;
    await db
      .update(pages)
      .set({ position: sql`${pages.position} + 1` })
      .where(and(eq(pages.issueId, issueId), gt(pages.position, afterPosition)));
  }
  const [page] = await db
    .insert(pages)
    .values({ orgId: org.id, issueId, position, templateKey, data: {}, status: "draft" })
    .returning();
  revalidatePath(`/issues/${issueId}`);
  return page.id;
}

export async function movePage(pageId: string, direction: -1 | 1) {
  const { page } = await ownedPage(pageId);
  const neighbour = await db.query.pages.findFirst({
    where: and(eq(pages.issueId, page.issueId), eq(pages.position, page.position + direction)),
  });
  if (!neighbour) return;
  await db.transaction(async (tx) => {
    await tx.update(pages).set({ position: neighbour.position }).where(eq(pages.id, page.id));
    await tx.update(pages).set({ position: page.position }).where(eq(pages.id, neighbour.id));
  });
  revalidatePath(`/issues/${page.issueId}`);
}

export async function deletePage(pageId: string) {
  const { page } = await ownedPage(pageId);
  await db.delete(pages).where(eq(pages.id, page.id));
  await renumber(page.issueId);
  revalidatePath(`/issues/${page.issueId}`);
}

const saveSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  section: z.string().nullable(),
  templateKey: z.string(),
  status: z.enum(["empty", "draft", "proofreading", "approved", "locked"]),
});

export async function savePage(pageId: string, input: z.infer<typeof saveSchema>) {
  const { page } = await ownedPage(pageId);
  if (page.status === "locked" && input.status === "locked") throw new Error("Page is locked. Unlock it to edit.");
  const parsed = saveSchema.parse(input);
  templateByKey(parsed.templateKey); // validates key exists (falls back otherwise)
  await db
    .update(pages)
    .set({
      data: parsed.data,
      section: parsed.section,
      templateKey: parsed.templateKey,
      status: parsed.status,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, page.id));
  revalidatePath(`/issues/${page.issueId}`);
  revalidatePath(`/issues/${page.issueId}/pages/${page.id}`);
}

// ---------- Free mode ----------

const boxSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["text", "image", "shape"]),
  x: z.number().min(-20).max(240),
  y: z.number().min(-20).max(320),
  w: z.number().min(1).max(260),
  h: z.number().min(1).max(340),
  rotate: z.number().min(-180).max(180).optional(),
  z: z.number().int().min(-100).max(1000).optional(),
  text: z.string().max(20000).optional(),
  fontSize: z.number().min(4).max(200).optional(),
  font: z.enum(["body", "heading"]).optional(),
  bold: z.boolean().optional(),
  color: z.string().max(32).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  src: z.string().max(2000).optional(),
  fill: z.string().max(32).optional(),
  radius: z.number().min(0).max(100).optional(),
});

/** Switches a page to free drag-and-drop editing. */
export async function unlockPage(pageId: string, base: "template" | "blank") {
  const { page } = await ownedPage(pageId);
  if (page.status === "locked") throw new Error("Page is locked.");
  await db
    .update(pages)
    .set({ mode: "free", boxes: page.boxes ?? [], data: { ...page.data, __freeBase: base }, updatedAt: new Date() })
    .where(eq(pages.id, page.id));
  revalidatePath(`/issues/${page.issueId}`);
  revalidatePath(`/issues/${page.issueId}/pages/${page.id}`);
}

/** Back to the plain template: free-mode boxes are removed. */
export async function resetToTemplate(pageId: string) {
  const { page } = await ownedPage(pageId);
  if (page.status === "locked") throw new Error("Page is locked.");
  const { __freeBase: _ignored, ...data } = page.data;
  void _ignored;
  await db.update(pages).set({ mode: "template", boxes: null, data, updatedAt: new Date() }).where(eq(pages.id, page.id));
  revalidatePath(`/issues/${page.issueId}`);
  revalidatePath(`/issues/${page.issueId}/pages/${page.id}`);
}

export async function saveFreeBoxes(pageId: string, boxes: unknown, base: "template" | "blank") {
  const { page } = await ownedPage(pageId);
  if (page.status === "locked") throw new Error("Page is locked.");
  const parsed = z.array(boxSchema).max(200).parse(boxes);
  await db
    .update(pages)
    .set({ boxes: parsed, data: { ...page.data, __freeBase: base }, updatedAt: new Date() })
    .where(eq(pages.id, page.id));
  revalidatePath(`/issues/${page.issueId}`);
  revalidatePath(`/issues/${page.issueId}/pages/${page.id}`);
}
