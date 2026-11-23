import type { CSSProperties, ReactNode } from "react";
import type { BrandKit } from "@/lib/brand";
import { CONTENT } from "./geometry";

export const str = (d: Record<string, unknown>, k: string, fallback = ""): string =>
  typeof d[k] === "string" ? (d[k] as string) : fallback;

export const list = <T = Record<string, unknown>,>(d: Record<string, unknown>, k: string): T[] =>
  Array.isArray(d[k]) ? (d[k] as T[]) : [];

export function Masthead({ brand, size }: { brand: BrandKit; size: "sm" | "lg" }) {
  const lines = brand.masthead;
  const big = lines[lines.length - 1];
  const small = lines.slice(0, -1);
  return (
    <div className={`mag-masthead mag-masthead-${size}`}>
      <div className="mag-masthead-small">
        {small.map((l, i) => (
          <div key={i} className={i === small.length - 1 ? "mag-masthead-strong" : undefined}>
            {l}
          </div>
        ))}
      </div>
      <div className="mag-masthead-big">{big}</div>
    </div>
  );
}

/** An image, or a labelled grey placeholder while the photo is missing. */
export function Img({ src, label, style }: { src: string; label: string; style?: CSSProperties }) {
  if (!src) {
    return (
      <div className="mag-placeholder" style={style} data-missing-image={label}>
        {label}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={label} style={{ objectFit: "cover", display: "block", ...style }} />;
}

/**
 * The area inside the standard frame. Marked so the preview and the PDF
 * preflight can detect text that does not fit.
 */
export function ContentArea({ even, children, style }: { even: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="mag-content"
      data-overflow-check
      style={{
        top: `${CONTENT.top}mm`,
        bottom: `${CONTENT.bottom}mm`,
        left: `${even ? CONTENT.outer : CONTENT.inner}mm`,
        right: `${even ? CONTENT.inner : CONTENT.outer}mm`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Light markup for article bodies, so the team can paste text from WhatsApp or Word:
 *   blank line   → new paragraph
 *   ## Heading   → sub-heading
 *   > Quote      → pull quote
 *   - item       → bullet
 */
export function Prose({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  return (
    <>
      {blocks.map((raw, i) => {
        const block = raw.trim();
        if (!block) return null;
        if (block.startsWith("## ")) return <h3 key={i}>{block.slice(3)}</h3>;
        if (block.startsWith("> "))
          return (
            <blockquote key={i} className="mag-pullquote">
              “{block.replace(/^>\s?/gm, "").trim()}”
            </blockquote>
          );
        if (block.split("\n").every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i}>
              {block.split("\n").map((l, j) => (
                <li key={j}>{l.trim().slice(2)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{block}</p>;
      })}
    </>
  );
}
