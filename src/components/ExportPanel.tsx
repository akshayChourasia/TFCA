"use client";

import { useState } from "react";

type Issue = { level: "error" | "warning"; page: number | null; message: string };

/** Print / digital PDF export with the preflight report. */
export function ExportPanel({ issueId, canOverride }: { issueId: string; canOverride: boolean }) {
  const [busy, setBusy] = useState<null | "print" | "digital">(null);
  const [report, setReport] = useState<{ mode: string; items: Issue[]; blocked: boolean } | null>(null);

  async function run(mode: "print" | "digital", force = false) {
    setBusy(mode);
    setReport(null);
    try {
      const res = await fetch(`/api/issues/${issueId}/pdf?mode=${mode}${force ? "&force=1" : ""}`);
      if (res.status === 422) {
        const body = (await res.json()) as { preflight: Issue[] };
        setReport({ mode, items: body.preflight, blocked: true });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "magazine.pdf";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setReport({ mode, items: [{ level: "error", page: null, message: String(e) }], blocked: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border bg-white p-4 text-sm">
      <div className="flex gap-2">
        <button
          onClick={() => run("print")}
          disabled={!!busy}
          className="flex-1 rounded bg-[#8b1e2d] px-3 py-2 font-semibold text-white disabled:opacity-50"
          title="CMYK PDF/X with 3 mm bleed, for the printer"
        >
          {busy === "print" ? "Preparing…" : "Print PDF (for printer)"}
        </button>
        <button
          onClick={() => run("digital")}
          disabled={!!busy}
          className="flex-1 rounded border border-[#1d2b4f] px-3 py-2 font-semibold text-[#1d2b4f] disabled:opacity-50"
          title="Small RGB PDF for WhatsApp"
        >
          {busy === "digital" ? "Preparing…" : "Digital PDF (WhatsApp)"}
        </button>
      </div>
      {report && (
        <div className="mt-3">
          <div className="font-semibold">
            {report.blocked ? "Fix these before exporting:" : "Exported with warnings:"}
          </div>
          <ul className="mt-1 max-h-60 overflow-auto space-y-1">
            {report.items.map((it, i) => (
              <li key={i} className={it.level === "error" ? "text-rose-700" : "text-amber-700"}>
                {it.page ? `Page ${it.page}: ` : ""}
                {it.message}
              </li>
            ))}
          </ul>
          {report.blocked && canOverride && (
            <button className="mt-2 text-xs underline text-neutral-600" onClick={() => run(report.mode as "print" | "digital", true)}>
              Export anyway (admin override)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
