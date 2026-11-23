import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { renderOrigin } from "@/lib/render-token";
import { can } from "@/lib/roles";
import { loadIssue } from "@/lib/issue-data";
import { exportIssuePdf, type PdfMode } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/issues/:id/pdf?mode=print|digital[&force=1]
 * Returns the PDF, or 422 with the preflight report when something would print badly.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/issues/[issueId]/pdf">) {
  const { issueId } = await ctx.params;
  const mode: PdfMode = req.nextUrl.searchParams.get("mode") === "print" ? "print" : "digital";
  let user;
  try {
    user = await requirePermission("export");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
  const org = user.org;
  const force = req.nextUrl.searchParams.get("force") === "1" && can(user.role, "export.override");
  const loaded = await loadIssue(org.id, issueId);
  if (!loaded) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  const origin = renderOrigin(req.nextUrl.origin);
  const result = await exportIssuePdf({ origin, loaded, mode, force });
  if (!result.ok) return NextResponse.json({ preflight: result.preflight }, { status: 422 });

  const name = `${org.shortName}-${loaded.issue.year}-${mode === "print" ? "print-PDFX-CMYK" : "digital"}.pdf`;
  return new NextResponse(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Preflight-Warnings": String(result.preflight.filter((p) => p.level === "warning").length),
    },
  });
}
