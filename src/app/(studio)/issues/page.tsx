import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { createIssue } from "../actions";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const user = await requireUser();
  const org = user.org;
  const rows = await db
    .select({
      id: schema.issues.id,
      title: schema.issues.title,
      year: schema.issues.year,
      editionLabel: schema.issues.editionLabel,
      status: schema.issues.status,
      pageCount: count(schema.pages.id),
    })
    .from(schema.issues)
    .leftJoin(schema.pages, eq(schema.pages.issueId, schema.issues.id))
    .where(eq(schema.issues.orgId, org.id))
    .groupBy(schema.issues.id)
    .orderBy(desc(schema.issues.year));

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold">Issues</h1>
      <ul className="mt-6 divide-y rounded-lg border bg-white">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/issues/${r.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50">
              <div>
                <div className="font-semibold">
                  {r.title} {r.year}
                </div>
                <div className="text-sm text-neutral-500">{r.editionLabel}</div>
              </div>
              <div className="text-sm text-neutral-500">
                {Number(r.pageCount)} pages · {r.status.replace("_", " ")}
              </div>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-5 py-4 text-neutral-500">No issues yet.</li>}
      </ul>

      {can(user.role, "issues.manage") && (
      <form action={createIssue} className="mt-8 rounded-lg border bg-white p-5 grid gap-3 sm:grid-cols-4 items-end">
        <label className="sm:col-span-2 text-sm">
          Title
          <input name="title" required defaultValue="Treasure Ki Abhivyakti" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm">
          Year
          <input name="year" type="number" required defaultValue={new Date().getFullYear() + 1} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm">
          Edition
          <input name="editionLabel" placeholder="द्वितीय संस्करण" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button className="sm:col-span-4 justify-self-start rounded bg-[#8b1e2d] px-4 py-2 text-white font-semibold">
          Create issue
        </button>
      </form>
      )}
    </div>
  );
}
