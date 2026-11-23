import type { CSSProperties, ReactNode } from "react";
import type { RenderContext, Box } from "./types";
import { Masthead } from "./parts";

import { A4, type SheetSize } from "./geometry";

/**
 * One magazine page drawn at real size in millimetres.
 * - `showBleed` adds the bleed area around the trim (print PDF); otherwise the sheet is the trim size.
 * - Full-bleed backgrounds use the `.bleed` class so they extend into the bleed area.
 */
export function PageSheet({
  size = A4,
  showBleed,
  frame,
  ctx,
  children,
  freeBoxes,
  freeBase = "template",
}: {
  size?: SheetSize;
  showBleed: boolean;
  frame: "none" | "standard";
  ctx: RenderContext;
  children?: ReactNode;
  freeBoxes?: Box[] | null;
  /** In free mode: keep the template's content under the boxes, or start from a blank page (frame only). */
  freeBase?: "template" | "blank";
}) {
  const b = showBleed ? size.bleed : 0;
  const even = ctx.pageNumber % 2 === 0;
  const style = {
    width: `${size.trimW + 2 * b}mm`,
    height: `${size.trimH + 2 * b}mm`,
    "--bleed": `${size.bleed}mm`,
    "--primary": ctx.brand.colors.primary,
    "--band": ctx.brand.colors.band,
    "--accent": ctx.brand.colors.accent,
    "--ink": ctx.brand.colors.text,
    "--font-body": ctx.brand.fonts.body,
    "--font-heading": ctx.brand.fonts.heading,
  } as CSSProperties;

  return (
    <div className="mag-sheet" style={style} data-page={ctx.pageNumber}>
      <div
        className="mag-trim"
        style={{ left: `${b}mm`, top: `${b}mm`, width: `${size.trimW}mm`, height: `${size.trimH}mm` }}
      >
        {frame === "standard" && <StandardFrame ctx={ctx} even={even} />}
        {!(freeBoxes && freeBase === "blank") && children}
        {freeBoxes && <FreeLayer boxes={freeBoxes} />}
      </div>
    </div>
  );
}

/** Header band with section label, and footer with page number and masthead (as in the 2026 issue). */
function StandardFrame({ ctx, even }: { ctx: RenderContext; even: boolean }) {
  return (
    <>
      <div className="mag-header bleed-top" style={{ flexDirection: even ? "row" : "row-reverse" }}>
        <div className="mag-header-bar" />
        <div className="mag-header-label">{ctx.section ?? ""}</div>
      </div>
      <div className="mag-footer bleed-bottom" style={{ flexDirection: even ? "row" : "row-reverse" }}>
        <div className="mag-footer-num">{String(ctx.pageNumber).padStart(2, "0")}</div>
        <div className="mag-footer-rule" />
        <Masthead brand={ctx.brand} size="sm" />
        <div className="mag-footer-bar" />
      </div>
    </>
  );
}

/** Free-mode rendering: absolutely positioned boxes in mm. */
export function FreeLayer({ boxes }: { boxes: Box[] }) {
  return (
    <>
      {[...boxes]
        .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
        .map((box) => (
          <div key={box.id} className="mag-box" style={boxStyle(box)} data-box-id={box.id}>
            <BoxContent box={box} />
          </div>
        ))}
    </>
  );
}

export function boxStyle(box: Box): CSSProperties {
  return {
    left: `${box.x}mm`,
    top: `${box.y}mm`,
    width: `${box.w}mm`,
    height: `${box.h}mm`,
    transform: box.rotate ? `rotate(${box.rotate}deg)` : undefined,
    background: box.kind === "shape" ? box.fill ?? "var(--band)" : undefined,
    borderRadius: box.radius ? `${box.radius}mm` : undefined,
    color: box.color,
    fontSize: box.fontSize ? `${box.fontSize}pt` : undefined,
    fontFamily: box.font === "heading" ? "var(--font-heading)" : undefined,
    fontWeight: box.bold ? 800 : undefined,
    textAlign: box.align,
    zIndex: 10 + (box.z ?? 0),
  };
}

export function BoxContent({ box }: { box: Box }) {
  if (box.kind === "text") return <div className="mag-box-text">{box.text}</div>;
  if (box.kind === "image")
    return box.src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={box.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
    ) : (
      <div className="mag-placeholder" style={{ width: "100%", height: "100%" }} data-missing-image="Free-mode image">
        Image
      </div>
    );
  return null;
}
