import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import { loadIssue } from "@/lib/issue-data";
import { PageThumb } from "@/components/PageThumb";
import { PageActions, AddPageBar } from "@/components/FlatplanControls";
import { ExportPanel } from "@/components/ExportPanel";
import { TEMPLATES } from "@/templates";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  empty: "bg-neutral-100 text-neutral-500",
  draft: "bg-amber-100 text-amber-800",
  proofreading: "bg-sky-100 text-sky-800",
  approved: "bg-emerald-100 text-emerald-800",
  locked: "bg-neutral-800 text-white",
};

export default async function FlatplanPage(props: PageProps<"/issues/[issueId]">) {
  const { issueId } = await props.params;
  const org = await getCurrentOrg();
  const loaded = await loadIssue(org.id, issueId);
  if (!loaded) notFound();
  const { issue, pages, ctx } = loaded;

  // Reader spreads: the cover alone, then pairs (2–3, 4–5, ...).
  const spreads: (typeof pages)[] = [];
  if (pages.length) spreads.push([pages[0]]);
  for (let i = 1; i < pages.length; i += 2) spreads.push(pages.slice(i, i + 2));

  const remainder = pages.length % 4;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/issues" className="text-sm text-neutral-500 hover:underline">← Issues</Link>
          <h1 className="text-2xl font-semibold mt-1">
            {issue.title} {issue.year}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {pages.length} pages · A4 · saddle stitch
            {remainder !== 0 && (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-amber-900">
                Add {4 - remainder} page{4 - remainder > 1 ? "s" : ""} to reach a multiple of 4 for printing
              </span>
            )}
          </p>
        </div>
        <ExportPanel issueId={issue.id} />
      </div>

      <AddPageBar
        issueId={issue.id}
        templates={TEMPLATES.map((t) => ({ key: t.key, name: t.name }))}
        positions={pages.map((p) => ({ position: p.position, label: `${p.pageNumber}. ${p.title}` }))}
      />

      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-8">
        {spreads.map((spread, si) => (
          <div key={si} className={`flex gap-0.5 ${si === 0 ? "pl-[164px]" : ""}`}>
            {spread.map((p) => (
              <div key={p.id} className="w-[164px]">
                <Link href={`/issues/${issue.id}/pages/${p.id}`} className="block ring-offset-2 hover:ring-2 ring-[#1f5fa8]">
                  <PageThumb page={p} ctx={{ ...ctx, pageNumber: p.pageNumber }} widthPx={164} />
                </Link>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold">{p.pageNumber}</span>
                  <span className={`rounded px-1.5 py-0.5 ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                </div>
                <div className="text-xs text-neutral-700 truncate" title={p.title}>{p.title}</div>
                <PageActions pageId={p.id} isFirst={p.pageNumber === 1} isLast={p.pageNumber === pages.length} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
