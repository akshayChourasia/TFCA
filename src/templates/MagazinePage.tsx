import { PageSheet } from "./PageSheet";
import { templateByKey } from "./index";
import type { Box, RenderContext } from "./types";

export type PageInput = {
  templateKey: string;
  section: string | null;
  mode: "template" | "free";
  data: Record<string, unknown>;
  boxes: Box[] | null;
};

/** Renders one stored page through its template (or its free-mode boxes). */
export function MagazinePage({
  page,
  ctx,
  showBleed,
}: {
  page: PageInput;
  ctx: Omit<RenderContext, "section">;
  showBleed: boolean;
}) {
  const tpl = templateByKey(page.templateKey);
  const fullCtx: RenderContext = { ...ctx, section: page.section ?? tpl.defaultSection ?? null };
  const data = { ...tpl.defaults, ...page.data };
  return (
    <PageSheet
      showBleed={showBleed}
      frame={tpl.frame}
      ctx={fullCtx}
      freeBoxes={page.mode === "free" ? page.boxes ?? [] : null}
      freeBase={page.data.__freeBase === "blank" ? "blank" : "template"}
    >
      {tpl.render(data, fullCtx)}
    </PageSheet>
  );
}
