import type { TemplateDef } from "../types";
import { ContentArea, Img, list, str } from "../parts";

const LAYOUTS: Record<string, { areas: string; slots: number; label: string }> = {
  full: { areas: '"a"', slots: 1, label: "One full page ad" },
  halves: { areas: '"a" "b"', slots: 2, label: "Two half page ads" },
  "half-quarters": { areas: '"a a" "b c"', slots: 3, label: "One half + two quarter page ads" },
  quarters: { areas: '"a b" "c d"', slots: 4, label: "Four quarter page ads" },
};

export const AD_LAYOUTS = LAYOUTS;

export const ads: TemplateDef = {
  key: "ads",
  name: "Ad page",
  description: "Full, half or quarter page ad slots. Artwork comes from ad bookings.",
  frame: "standard",
  defaultSection: "TFCA",
  fields: [
    {
      key: "layout",
      label: "Layout",
      type: "select",
      options: Object.entries(LAYOUTS).map(([value, l]) => ({ value, label: l.label })),
    },
    {
      key: "slots",
      label: "Ads",
      type: "list",
      itemLabel: "Ad",
      itemFields: [
        { key: "advertiser", label: "Advertiser", type: "text" },
        { key: "artwork", label: "Artwork (300 dpi)", type: "image" },
      ],
    },
  ],
  defaults: { layout: "full", slots: [{ advertiser: "", artwork: "" }] },
  titleOf: (d) => {
    const names = list<{ advertiser: string }>(d, "slots").map((s) => s.advertiser).filter(Boolean);
    return names.length ? `Ads: ${names.join(", ")}` : "Ad page";
  },
  render: (d, ctx) => {
    const layout = LAYOUTS[str(d, "layout", "full")] ?? LAYOUTS.full;
    const slots = list<{ advertiser: string; artwork: string }>(d, "slots");
    return (
      <ContentArea even={ctx.pageNumber % 2 === 0}>
        <div className="tpl-ads" style={{ gridTemplateAreas: layout.areas }}>
          {Array.from({ length: layout.slots }, (_, i) => {
            const s = slots[i] ?? { advertiser: "", artwork: "" };
            return (
              <div key={i} style={{ gridArea: "abcd"[i] }} className="tpl-ad-slot">
                <Img src={s.artwork} label={s.advertiser ? `Artwork: ${s.advertiser}` : "Ad artwork"} style={{ width: "100%", height: "100%" }} />
              </div>
            );
          })}
        </div>
      </ContentArea>
    );
  },
};
