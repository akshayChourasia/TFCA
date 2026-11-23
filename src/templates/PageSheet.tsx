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
}: {
  size?: SheetSize;
  showBleed: boolean;
  frame: "none" | "standard";
  ctx: RenderContext;
  children?: ReactNode;
  freeBoxes?: Box[] | null;
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
        {freeBoxes ? <FreeLayer boxes={freeBoxes} /> : children}
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
          <div
            key={box.id}
            className="mag-box"
            style={{
              left: `${box.x}mm`,
              top: `${box.y}mm`,
              width: `${box.w}mm`,
              height: `${box.h}mm`,
              transform: box.rotate ? `rotate(${box.rotate}deg)` : undefined,
              background: box.kind === "shape" ? box.fill ?? "var(--band)" : undefined,
              color: box.color,
              fontSize: box.fontSize ? `${box.fontSize}pt` : undefined,
              textAlign: box.align,
            }}
          >
            {box.kind === "text" && <div className="mag-prose">{box.text}</div>}
            {box.kind === "image" &&
              (box.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={box.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div className="mag-placeholder">Image</div>
              ))}
          </div>
        ))}
    </>
  );
}
