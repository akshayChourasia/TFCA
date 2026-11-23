import { notFound } from "next/navigation";
import { loadIssue } from "@/lib/issue-data";
import { verifyRender } from "@/lib/render-token";
import { MagazinePage } from "@/templates/MagazinePage";
import { A4 } from "@/templates/geometry";

export const dynamic = "force-dynamic";

/** Bare page list opened by headless Chromium to produce the PDF. */
export default async function RenderIssue(props: PageProps<"/render/[issueId]">) {
  const { issueId } = await props.params;
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const mode = sp.mode === "print" ? "print" : "digital";
  const orgId = verifyRender(token, issueId);
  if (!orgId) notFound();
  const loaded = await loadIssue(orgId, issueId);
  if (!loaded) notFound();

  const bleed = mode === "print" ? A4.bleed : 0;
  const pageCss = `@page { size: ${A4.trimW + 2 * bleed}mm ${A4.trimH + 2 * bleed}mm; margin: 0; }`;

  return (
    <>
      <style>{pageCss}</style>
      {loaded.pages.map((p) => (
        <MagazinePage
          key={p.id}
          page={p}
          ctx={{ ...loaded.ctx, pageNumber: p.pageNumber }}
          showBleed={mode === "print"}
        />
      ))}
    </>
  );
}
