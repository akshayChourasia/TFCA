"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { resetToTemplate, saveFreeBoxes, savePage, unlockPage } from "@/app/(studio)/actions";
import { BoxInspector, FreeCanvas, newBox } from "./FreeEditor";
import { TEMPLATES, templateByKey } from "@/templates";
import { MagazinePage } from "@/templates/MagazinePage";
import type { Box, FieldDef, RenderContext } from "@/templates/types";
import { A4 } from "@/templates/geometry";

type Status = "empty" | "draft" | "proofreading" | "approved" | "locked";
const STATUSES: Status[] = ["draft", "proofreading", "approved", "locked"];
const PX_PER_MM = 96 / 25.4;

export function PageEditor({
  pageId,
  initial,
  mode,
  boxes: boxes0,
  ctx,
}: {
  pageId: string;
  initial: { templateKey: string; section: string | null; data: Record<string, unknown>; status: Status };
  mode: "template" | "free";
  boxes: Box[] | null;
  ctx: Omit<RenderContext, "section">;
}) {
  const [templateKey, setTemplateKey] = useState(initial.templateKey);
  const [section, setSection] = useState(initial.section ?? "");
  const [status, setStatus] = useState<Status>(initial.status);
  const tpl = templateByKey(templateKey);
  const [data, setData] = useState<Record<string, unknown>>({ ...tpl.defaults, ...initial.data });
  const [saved, setSaved] = useState(true);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const locked = status === "locked";
  const [freeMode, setFreeMode] = useState(mode === "free");
  const [boxes, setBoxes] = useState<Box[]>(boxes0 ?? []);
  const [base, setBase] = useState<"template" | "blank">(initial.data.__freeBase === "blank" ? "blank" : "template");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = boxes.find((b) => b.id === selectedId) ?? null;
  const setBoxesDirty = (next: Box[]) => {
    setBoxes(next);
    setSaved(false);
  };

  const update = (key: string, value: unknown) => {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  const save = () =>
    start(async () => {
      setError(null);
      try {
        await savePage(pageId, { data, section: section || null, templateKey, status });
        if (freeMode) await saveFreeBoxes(pageId, boxes, base);
        setSaved(true);
      } catch (e) {
        setError(String(e));
      }
    });

  // Cmd/Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(340px,440px)_1fr]">
      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-4 space-y-3 text-sm">
          <label className="block">
            Template
            <select
              disabled={locked}
              value={templateKey}
              onChange={(e) => {
                const next = templateByKey(e.target.value);
                setTemplateKey(next.key);
                setData((d) => ({ ...next.defaults, ...d }));
                setSaved(false);
              }}
              className="mt-1 block w-full rounded border px-2 py-1.5"
            >
              {TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
            <span className="text-xs text-neutral-500">{tpl.description}</span>
          </label>
          {tpl.frame === "standard" && (
            <label className="block">
              Section label (header band)
              <input
                disabled={locked}
                value={section}
                placeholder={tpl.defaultSection}
                onChange={(e) => {
                  setSection(e.target.value);
                  setSaved(false);
                }}
                className="mt-1 block w-full rounded border px-2 py-1.5"
              />
            </label>
          )}
          <label className="block">
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as Status);
                setSaved(false);
              }}
              className="mt-1 block w-full rounded border px-2 py-1.5"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-3 text-sm">
          {!freeMode ? (
            <>
              <div className="font-semibold">Free editing</div>
              <p className="text-neutral-600">Unlock this page to drag, resize and add your own text, images and shapes.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={locked || pending}
                  className="rounded border border-[#1d2b4f] px-3 py-1.5 font-semibold text-[#1d2b4f] disabled:opacity-50"
                  onClick={() =>
                    start(async () => {
                      await savePage(pageId, { data, section: section || null, templateKey, status });
                      await unlockPage(pageId, "template");
                      setBase("template");
                      setFreeMode(true);
                      setSaved(true);
                    })
                  }
                >
                  Unlock, keep template content
                </button>
                <button
                  disabled={locked || pending}
                  className="rounded border px-3 py-1.5 disabled:opacity-50"
                  onClick={() =>
                    start(async () => {
                      await savePage(pageId, { data, section: section || null, templateKey, status });
                      await unlockPage(pageId, "blank");
                      setBase("blank");
                      setFreeMode(true);
                      setSaved(true);
                    })
                  }
                >
                  Unlock as blank page
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Free editing</span>
                <button
                  disabled={locked || pending}
                  className="text-rose-700 underline disabled:opacity-50"
                  onClick={() => {
                    if (!confirm("Remove all free-mode boxes and go back to the template?")) return;
                    start(async () => {
                      await resetToTemplate(pageId);
                      setFreeMode(false);
                      setBoxes([]);
                      setSelectedId(null);
                      setData((d) => {
                        const { __freeBase: _b, ...rest } = d;
                        void _b;
                        return rest;
                      });
                      setSaved(true);
                    });
                  }}
                >
                  Reset to template
                </button>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={base === "template"}
                  onChange={(e) => {
                    setBase(e.target.checked ? "template" : "blank");
                    setSaved(false);
                  }}
                />
                Show the template&apos;s content under the boxes
              </label>
              <div className="flex gap-2">
                {(["text", "image", "shape"] as const).map((k) => (
                  <button
                    key={k}
                    disabled={locked}
                    className="rounded bg-[#1d2b4f] px-3 py-1.5 text-white disabled:opacity-50"
                    onClick={() => {
                      const b = newBox(k, boxes);
                      setBoxesDirty([...boxes, b]);
                      setSelectedId(b.id);
                    }}
                  >
                    + {k === "text" ? "Text" : k === "image" ? "Image" : "Shape"}
                  </button>
                ))}
              </div>
              {selected && !locked && (
                <div className="border-t pt-3">
                  <BoxInspector
                    box={selected}
                    onChange={(nb) => setBoxesDirty(boxes.map((b) => (b.id === nb.id ? nb : b)))}
                    onDelete={() => {
                      setBoxesDirty(boxes.filter((b) => b.id !== selected.id));
                      setSelectedId(null);
                    }}
                    onLayer={(dir) =>
                      setBoxesDirty(boxes.map((b) => (b.id === selected.id ? { ...b, z: (b.z ?? 0) + dir } : b)))
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>

        {!(freeMode && base === "blank") && (
          <fieldset disabled={locked} className="rounded-lg border bg-white p-4 space-y-4 text-sm disabled:opacity-60">
            {tpl.fields.map((f) => (
              <Field key={f.key} field={f} value={data[f.key]} onChange={(v) => update(f.key, v)} />
            ))}
          </fieldset>
        )}

        <div className="sticky bottom-0 flex items-center gap-3 bg-[var(--background)] py-3">
          <button
            onClick={save}
            disabled={pending || saved}
            className="rounded bg-[#8b1e2d] px-5 py-2 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : saved ? "Saved" : "Save (Ctrl+S)"}
          </button>
          {error && <span className="text-sm text-rose-700">{error}</span>}
        </div>
      </div>

      {freeMode ? (
        <FreeCanvas
          page={{ templateKey, section: section || null, mode: "free", data: { ...data, __freeBase: base }, boxes }}
          ctx={ctx}
          boxes={boxes}
          onChange={setBoxesDirty}
          selectedId={selectedId}
          onSelect={setSelectedId}
          disabled={locked}
        />
      ) : (
        <Preview page={{ templateKey, section: section || null, mode: "template", data, boxes: null }} ctx={ctx} />
      )}
    </div>
  );
}

/** Live A4 preview, scaled to fit, with an overflow warning. */
function Preview({
  page,
  ctx,
}: {
  page: Parameters<typeof MagazinePage>[0]["page"];
  ctx: Omit<RenderContext, "section">;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [overflow, setOverflow] = useState(false);
  const fullW = A4.trimW * PX_PER_MM;
  const scale = Math.min(1.2, width / fullW);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.min(entry.contentRect.width, 820)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageKey = useMemo(() => JSON.stringify(page), [page]);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const areas = wrap.current?.querySelectorAll<HTMLElement>("[data-overflow-check]") ?? [];
      let any = false;
      areas.forEach((a) => {
        const over = a.scrollHeight > a.clientHeight + 2 || a.scrollWidth > a.clientWidth + 2;
        a.dataset.overflowing = String(over);
        any ||= over;
      });
      setOverflow(any);
    });
    return () => cancelAnimationFrame(id);
  }, [pageKey, width]);

  return (
    <div ref={wrap} className="min-w-0">
      {overflow && (
        <div className="mb-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Text does not fit on this page. Shorten it, or move part of it to a new page.
        </div>
      )}
      <div style={{ width: fullW * scale, height: A4.trimH * PX_PER_MM * scale }} className="shadow-lg">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <MagazinePage page={page} ctx={ctx} showBleed={false} />
        </div>
      </div>
    </div>
  );
}

function Field({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const input = "mt-1 block w-full rounded border px-2 py-1.5";
  switch (field.type) {
    case "text":
      return (
        <label className="block">
          {field.label}
          <input className={input} placeholder={field.placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "textarea":
      return (
        <label className="block">
          {field.label}
          <textarea
            className={`${input} font-[Noto_Serif_Devanagari] leading-relaxed`}
            rows={field.rows ?? 4}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && <span className="text-xs text-neutral-500">{field.help}</span>}
        </label>
      );
    case "select":
      return (
        <label className="block">
          {field.label}
          <select className={input} value={(value as string) ?? field.options[0]?.value} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      );
    case "image":
      return <ImageField label={field.label} value={(value as string) ?? ""} onChange={onChange} />;
    case "list": {
      const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      const set = (next: Record<string, unknown>[]) => onChange(next);
      return (
        <div>
          <div className="font-medium">{field.label}</div>
          <div className="mt-2 space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded border border-dashed p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{field.itemLabel} {i + 1}</span>
                  <span className="flex gap-2">
                    <button type="button" disabled={i === 0} onClick={() => set(swap(items, i, i - 1))}>↑</button>
                    <button type="button" disabled={i === items.length - 1} onClick={() => set(swap(items, i, i + 1))}>↓</button>
                    <button type="button" className="text-rose-700" onClick={() => set(items.filter((_, j) => j !== i))}>Remove</button>
                  </span>
                </div>
                {field.itemFields.map((sub) => (
                  <Field
                    key={sub.key}
                    field={sub}
                    value={item[sub.key]}
                    onChange={(v) => set(items.map((it, j) => (j === i ? { ...it, [sub.key]: v } : it)))}
                  />
                ))}
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 text-sm text-[#1f5fa8]" onClick={() => set([...items, {}])}>
            + Add {field.itemLabel.toLowerCase()}
          </button>
        </div>
      );
    }
  }
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div>{label}</div>
      <div className="mt-1 flex gap-2">
        <input className="block w-full rounded border px-2 py-1.5" placeholder="Paste an image URL or upload" value={value} onChange={(e) => onChange(e.target.value)} />
        <label className="shrink-0 cursor-pointer rounded border px-3 py-1.5 hover:bg-neutral-50">
          {busy ? "…" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/uploads", { method: "POST", body: fd });
              setBusy(false);
              if (res.ok) onChange(((await res.json()) as { url: string }).url);
            }}
          />
        </label>
      </div>
    </div>
  );
}

function swap<T>(arr: T[], a: number, b: number) {
  const next = [...arr];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
