import type { TemplateDef } from "../types";
import { Img, Masthead, list, str } from "../parts";

export const cover: TemplateDef = {
  key: "cover",
  name: "Cover",
  description: "Masthead, edition badge, full-bleed hero photo and the five pillars.",
  frame: "none",
  fields: [
    { key: "heroImage", label: "Hero photo (full bleed)", type: "image" },
    { key: "badgeTop", label: "Badge line 1", type: "text", placeholder: "वार्षिक विशेषांक" },
    { key: "badgeNote", label: "Badge line 2", type: "text", placeholder: "द्वितीय संस्करण" },
    { key: "subtitle", label: "Subtitle", type: "text" },
    { key: "strapline", label: "Strapline (use | between parts)", type: "text" },
    {
      key: "pillars",
      label: "Pillars",
      type: "list",
      itemLabel: "Pillar",
      itemFields: [{ key: "label", label: "Label", type: "text" }],
    },
    { key: "footerLine", label: "Footer line", type: "text" },
  ],
  defaults: {
    heroImage: "",
    badgeTop: "वार्षिक विशेषांक",
    badgeNote: "द्वितीय संस्करण",
    subtitle: "AN ANNUAL MAGAZINE BY TFCA",
    strapline: "हमारे लोग | हमारी कहानियाँ | हमारा Treasure",
    pillars: ["PEOPLE", "KNOWLEDGE", "CULTURE", "ACHIEVEMENTS", "COMMUNITY"].map((label) => ({ label })),
    footerLine: "TOGETHER FOR A BRIGHTER TOMORROW",
  },
  titleOf: () => "Cover",
  render: (d, ctx) => (
    <div className="tpl-cover">
      <Img src={str(d, "heroImage")} label="Hero photo" style={{ position: "absolute", inset: "calc(-1 * var(--bleed))", width: "auto", height: "auto" }} />
      <div className="tpl-cover-sky bleed-top" />
      <div className="tpl-cover-badge">
        <div>{str(d, "badgeTop")}</div>
        <div className="tpl-cover-year">{ctx.issue.year}</div>
        <div className="tpl-cover-note">“{str(d, "badgeNote")}”</div>
      </div>
      <div className="tpl-cover-mast">
        <Masthead brand={ctx.brand} size="lg" />
        <div className="tpl-cover-sub">— {str(d, "subtitle")} —</div>
        <div className="tpl-cover-strap">
          {str(d, "strapline")
            .split("|")
            .map((s, i) => (
              <span key={i}>{s.trim()}</span>
            ))}
        </div>
      </div>
      <div className="tpl-cover-base bleed-bottom">
        <div className="tpl-cover-pillars">
          {list<{ label: string }>(d, "pillars").map((p, i) => (
            <span key={i}>{p.label}</span>
          ))}
        </div>
        <div className="tpl-cover-footer">{str(d, "footerLine")}</div>
      </div>
    </div>
  ),
};
