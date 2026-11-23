import { MagazinePage, type PageInput } from "@/templates/MagazinePage";
import type { RenderContext } from "@/templates/types";
import { A4 } from "@/templates/geometry";

const PX_PER_MM = 96 / 25.4;

/** A real render of the page, scaled down for the flatplan. */
export function PageThumb({
  page,
  ctx,
  widthPx,
}: {
  page: PageInput;
  ctx: Omit<RenderContext, "section">;
  widthPx: number;
}) {
  const scale = widthPx / (A4.trimW * PX_PER_MM);
  return (
    <div style={{ width: widthPx, height: A4.trimH * PX_PER_MM * scale, overflow: "hidden" }} className="bg-white shadow-sm">
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
        <MagazinePage page={page} ctx={ctx} showBleed={false} />
      </div>
    </div>
  );
}
