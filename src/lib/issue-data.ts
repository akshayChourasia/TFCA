import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { templateByKey } from "@/templates";
import type { RenderContext } from "@/templates/types";
import type { PageInput } from "@/templates/MagazinePage";

export type LoadedPage = PageInput & {
  id: string;
  position: number;
  status: (typeof schema.pages.$inferSelect)["status"];
  pageNumber: number;
  title: string;
};

/** Loads an issue with everything needed to render any of its pages. Always scoped to `orgId`. */
export async function loadIssue(orgId: string, issueId: string) {
  const issue = await db.query.issues.findFirst({
    where: and(eq(schema.issues.id, issueId), eq(schema.issues.orgId, orgId)),
  });
  if (!issue) return null;
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) });
  if (!org) return null;

  const [pageRows, memberRows, teamRows] = await Promise.all([
    db.query.pages.findMany({
      where: and(eq(schema.pages.issueId, issueId), eq(schema.pages.orgId, orgId)),
      orderBy: asc(schema.pages.position),
    }),
    db.query.members.findMany({
      where: and(eq(schema.members.orgId, orgId), eq(schema.members.showInDirectory, true)),
      orderBy: asc(schema.members.name),
    }),
    db.query.teamUsers.findMany({ where: eq(schema.teamUsers.orgId, orgId), orderBy: asc(schema.teamUsers.createdAt) }),
  ]);

  // Page 1 is the cover; numbering follows the stored order.
  const pages: LoadedPage[] = pageRows.map((p, i) => {
    const tpl = templateByKey(p.templateKey);
    return {
      id: p.id,
      position: p.position,
      status: p.status,
      templateKey: p.templateKey,
      section: p.section,
      mode: p.mode,
      data: p.data,
      boxes: p.boxes ?? null,
      pageNumber: i + 1,
      title: tpl.titleOf({ ...tpl.defaults, ...p.data }),
    };
  });

  const ctx: Omit<RenderContext, "section" | "pageNumber"> = {
    brand: org.brand,
    issue: { title: issue.title, year: issue.year, editionLabel: issue.editionLabel },
    directory: memberRows.map((m) => ({ name: m.name, unit: m.unit, phone: m.phone })),
    team: teamRows
      .filter((t) => t.creditTitle)
      .map((t) => ({ name: t.name, creditTitle: t.creditTitle, creditQuote: t.creditQuote, photoUrl: t.photoUrl })),
    contents: pages
      .filter((p) => !["cover", "contents", "ads"].includes(p.templateKey))
      .map((p) => ({ title: p.title, pageNumber: p.pageNumber, section: p.section })),
  };

  return { org, issue, pages, ctx };
}

export type LoadedIssue = NonNullable<Awaited<ReturnType<typeof loadIssue>>>;
