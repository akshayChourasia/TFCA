"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPage, deletePage, movePage } from "@/app/(studio)/actions";

export function PageActions({ pageId, isFirst, isLast }: { pageId: string; isFirst: boolean; isLast: boolean }) {
  const [pending, start] = useTransition();
  const btn = "rounded px-1.5 py-0.5 hover:bg-neutral-200 disabled:opacity-30";
  return (
    <div className={`mt-1 flex gap-1 text-xs text-neutral-600 ${pending ? "opacity-50" : ""}`}>
      <button className={btn} disabled={isFirst || pending} onClick={() => start(() => movePage(pageId, -1))} title="Move earlier">←</button>
      <button className={btn} disabled={isLast || pending} onClick={() => start(() => movePage(pageId, 1))} title="Move later">→</button>
      <button
        className={`${btn} ml-auto text-rose-700`}
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this page?")) start(() => deletePage(pageId));
        }}
      >
        Delete
      </button>
    </div>
  );
}

export function AddPageBar({
  issueId,
  templates,
  positions,
}: {
  issueId: string;
  templates: { key: string; name: string }[];
  positions: { position: number; label: string }[];
}) {
  const router = useRouter();
  const [tpl, setTpl] = useState(templates[0]?.key ?? "article");
  const [after, setAfter] = useState<string>("end");
  const [pending, start] = useTransition();
  return (
    <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm">
      <label>
        New page
        <select value={tpl} onChange={(e) => setTpl(e.target.value)} className="mt-1 block rounded border px-2 py-1.5">
          {templates.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
      </label>
      <label>
        Insert after
        <select value={after} onChange={(e) => setAfter(e.target.value)} className="mt-1 block rounded border px-2 py-1.5 max-w-72">
          <option value="end">At the end</option>
          {positions.map((p) => (
            <option key={p.position} value={p.position}>{p.label}</option>
          ))}
        </select>
      </label>
      <button
        disabled={pending}
        className="rounded bg-[#1d2b4f] px-4 py-2 font-semibold text-white disabled:opacity-50"
        onClick={() =>
          start(async () => {
            const id = await addPage(issueId, tpl, after === "end" ? null : Number(after));
            router.push(`/issues/${issueId}/pages/${id}`);
          })
        }
      >
        {pending ? "Adding…" : "Add page"}
      </button>
    </div>
  );
}
