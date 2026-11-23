"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MagazinePage, type PageInput } from "@/templates/MagazinePage";
import type { Box, RenderContext } from "@/templates/types";
import { A4 } from "@/templates/geometry";

const PX_PER_MM = 96 / 25.4;
const SAFE_MM = 5;
const snap = (v: number, step = 0.5) => Math.round(v / step) * step;

export const newBox = (kind: Box["kind"], boxes: Box[]): Box => {
  const z = boxes.reduce((m, b) => Math.max(m, b.z ?? 0), 0) + 1;
  const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  if (kind === "text") return { id, kind, x: 30, y: 40, w: 120, h: 30, z, text: "नया टेक्स्ट", fontSize: 14, font: "heading", bold: true, color: "#8b1e2d" };
  if (kind === "image") return { id, kind, x: 40, y: 80, w: 100, h: 70, z, src: "" };
  return { id, kind, x: 20, y: 60, w: 170, h: 12, z, fill: "#bcd8f2" };
};

/**
 * Page canvas for free mode: renders the real page, with drag and resize
 * handles over each box. Units stay in mm so the PDF matches exactly.
 */
export function FreeCanvas({
  page,
  ctx,
  boxes,
  onChange,
  selectedId,
  onSelect,
  disabled,
}: {
  page: PageInput;
  ctx: Omit<RenderContext, "section">;
  boxes: Box[];
  onChange: (boxes: Box[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const fullW = A4.trimW * PX_PER_MM;
  const scale = Math.min(1.2, width / fullW);
  const pxPerMm = PX_PER_MM * scale;
  const drag = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; orig: Box } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.min(entry.contentRect.width, 820)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard: arrows nudge (Shift = 5 mm), Delete removes.
  useEffect(() => {
    if (!selectedId || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const step = e.shiftKey ? 5 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) {
        e.preventDefault();
        onChange(boxes.map((b) => (b.id === selectedId ? { ...b, x: b.x + d[0], y: b.y + d[1] } : b)));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onChange(boxes.filter((b) => b.id !== selectedId));
        onSelect(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, boxes, onChange, onSelect, disabled]);

  const start = (e: ReactPointerEvent, box: Box, mode: "move" | "resize") => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(box.id);
    drag.current = { id: box.id, mode, startX: e.clientX, startY: e.clientY, orig: box };
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / pxPerMm;
    const dy = (e.clientY - d.startY) / pxPerMm;
    const next =
      d.mode === "move"
        ? { ...d.orig, x: snap(d.orig.x + dx), y: snap(d.orig.y + dy) }
        : { ...d.orig, w: Math.max(3, snap(d.orig.w + dx)), h: Math.max(3, snap(d.orig.h + dy)) };
    onChange(boxes.map((b) => (b.id === d.id ? next : b)));
  };
  const end = () => {
    drag.current = null;
  };

  return (
    <div ref={wrap} className="min-w-0">
      <div className="mb-2 text-xs text-neutral-500">
        Drag boxes to move, drag the corner to resize, arrow keys to nudge. The dashed line is the 5 mm safe margin; keep text inside it.
      </div>
      <div
        style={{ width: fullW * scale, height: A4.trimH * PX_PER_MM * scale, position: "relative" }}
        className="shadow-lg select-none"
        onPointerDown={() => onSelect(null)}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <MagazinePage page={{ ...page, mode: "free", boxes }} ctx={ctx} showBleed={false} />
        </div>
        {/* Safe-margin guide */}
        <div
          className="pointer-events-none absolute border border-dashed border-sky-500/70"
          style={{ left: SAFE_MM * pxPerMm, top: SAFE_MM * pxPerMm, right: SAFE_MM * pxPerMm, bottom: SAFE_MM * pxPerMm }}
        />
        {boxes.map((b) => {
          const sel = b.id === selectedId;
          return (
            <div
              key={b.id}
              onPointerDown={(e) => start(e, b, "move")}
              onPointerMove={move}
              onPointerUp={end}
              className={`absolute ${disabled ? "" : "cursor-move"} ${sel ? "outline-2 outline-[#1f5fa8]" : "hover:outline hover:outline-1 hover:outline-[#1f5fa8]/60"}`}
              style={{
                left: b.x * pxPerMm,
                top: b.y * pxPerMm,
                width: b.w * pxPerMm,
                height: b.h * pxPerMm,
                outlineStyle: sel ? "solid" : undefined,
                zIndex: 100 + (b.z ?? 0),
              }}
            >
              {sel && !disabled && (
                <div
                  onPointerDown={(e) => start(e, b, "resize")}
                  onPointerMove={move}
                  onPointerUp={end}
                  className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-[#1f5fa8]"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Properties of the selected box. */
export function BoxInspector({
  box,
  onChange,
  onDelete,
  onLayer,
}: {
  box: Box;
  onChange: (b: Box) => void;
  onDelete: () => void;
  onLayer: (dir: 1 | -1) => void;
}) {
  const input = "mt-1 block w-full rounded border px-2 py-1";
  const num = (key: keyof Box, label: string, step = 0.5) => (
    <label className="block">
      {label}
      <input
        type="number"
        step={step}
        value={(box[key] as number | undefined) ?? ""}
        onChange={(e) => onChange({ ...box, [key]: e.target.value === "" ? undefined : Number(e.target.value) })}
        className={input}
      />
    </label>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold capitalize">{box.kind} box</span>
        <span className="flex gap-2 text-xs">
          <button type="button" onClick={() => onLayer(1)}>Bring forward</button>
          <button type="button" onClick={() => onLayer(-1)}>Send back</button>
          <button type="button" className="text-rose-700" onClick={onDelete}>Delete</button>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {num("x", "X mm")}
        {num("y", "Y mm")}
        {num("w", "W mm")}
        {num("h", "H mm")}
      </div>
      {box.kind === "text" && (
        <>
          <label className="block">
            Text
            <textarea rows={5} value={box.text ?? ""} onChange={(e) => onChange({ ...box, text: e.target.value })} className={input} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {num("fontSize", "Size pt", 0.5)}
            <label className="block">
              Font
              <select value={box.font ?? "body"} onChange={(e) => onChange({ ...box, font: e.target.value as Box["font"] })} className={input}>
                <option value="body">Body (serif)</option>
                <option value="heading">Heading</option>
              </select>
            </label>
            <label className="block">
              Align
              <select value={box.align ?? "left"} onChange={(e) => onChange({ ...box, align: e.target.value as Box["align"] })} className={input}>
                <option value="left">Left</option>
                <option value="center">Centre</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!box.bold} onChange={(e) => onChange({ ...box, bold: e.target.checked })} /> Bold
            </label>
            <label className="flex items-center gap-2">
              Colour
              <input type="color" value={box.color ?? "#1d1d1f"} onChange={(e) => onChange({ ...box, color: e.target.value })} />
            </label>
          </div>
        </>
      )}
      {box.kind === "image" && (
        <label className="block">
          Image
          <div className="mt-1 flex gap-2">
            <input value={box.src ?? ""} placeholder="URL or upload" onChange={(e) => onChange({ ...box, src: e.target.value })} className="block w-full rounded border px-2 py-1" />
            <label className="shrink-0 cursor-pointer rounded border px-2 py-1 hover:bg-neutral-50">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/uploads", { method: "POST", body: fd });
                  if (res.ok) onChange({ ...box, src: ((await res.json()) as { url: string }).url });
                }}
              />
            </label>
          </div>
        </label>
      )}
      {box.kind === "shape" && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            Fill
            <input type="color" value={box.fill ?? "#bcd8f2"} onChange={(e) => onChange({ ...box, fill: e.target.value })} />
          </label>
        </div>
      )}
      {box.kind !== "text" && (
        <div className="grid grid-cols-2 gap-2">
          {num("radius", "Corner radius mm")}
          {num("rotate", "Rotate °", 1)}
        </div>
      )}
    </div>
  );
}
