import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { loadIssue } from "@/lib/issue-data";
import { PageEditor } from "@/components/PageEditor";

export const dynamic = "force-dynamic";

export default async function EditPage(props: PageProps<"/issues/[issueId]/pages/[pageId]">) {
  const { issueId, pageId } = await props.params;
  const user = await requireUser();
  const org = user.org;
  const loaded = await loadIssue(org.id, issueId);
  const page = loaded?.pages.find((p) => p.id === pageId);
  if (!loaded || !page) notFound();
  const idx = loaded.pages.indexOf(page);
  const prev = loaded.pages[idx - 1];
  const next = loaded.pages[idx + 1];

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 text-sm">
        <Link href={`/issues/${issueId}`} className="text-neutral-500 hover:underline">← Flatplan</Link>
        <span className="text-neutral-300">|</span>
        {prev ? <Link className="hover:underline" href={`/issues/${issueId}/pages/${prev.id}`}>‹ Page {prev.pageNumber}</Link> : <span />}
        <span className="font-semibold">Page {page.pageNumber}</span>
        {next && <Link className="hover:underline" href={`/issues/${issueId}/pages/${next.id}`}>Page {next.pageNumber} ›</Link>}
      </div>
      <PageEditor
        key={page.id}
        pageId={page.id}
        initial={{ templateKey: page.templateKey, section: page.section, data: page.data, status: page.status }}
        mode={page.mode}
        boxes={page.boxes}
        ctx={{ ...loaded.ctx, pageNumber: page.pageNumber }}
        perms={{ edit: can(user.role, "pages.edit"), approve: can(user.role, "pages.approve"), lock: can(user.role, "pages.lock") }}
      />
    </div>
  );
}
