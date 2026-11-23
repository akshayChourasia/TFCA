import type { TemplateDef } from "../types";
import { ContentArea, Img, str } from "../parts";

/** Credits page generated from the team roster. */
export const team: TemplateDef = {
  key: "team",
  name: "Team & credits",
  description: "Photo cards with role and quote, generated from the team roster.",
  frame: "standard",
  defaultSection: "TFCA",
  fields: [
    { key: "title", label: "Title", type: "text" },
    { key: "footerNote", label: "Note under the team", type: "textarea", rows: 2 },
  ],
  defaults: { title: "CONCEPT | VISION | CREATORS | EDITORS", footerNote: "" },
  titleOf: () => "Team",
  render: (d, ctx) => (
    <ContentArea even={ctx.pageNumber % 2 === 0}>
      <h1 className="tpl-team-title">{str(d, "title")}</h1>
      <div className="tpl-team-grid">
        {ctx.team.map((m, i) => (
          <div key={i} className="tpl-team-card">
            <Img src={m.photoUrl ?? ""} label={m.name} style={{ width: "100%", height: "38mm" }} />
            <div className="tpl-team-name">{m.name}</div>
            {m.creditTitle && <div className="tpl-team-role">{m.creditTitle}</div>}
            {m.creditQuote && <div className="tpl-team-quote">{m.creditQuote}</div>}
          </div>
        ))}
      </div>
      {str(d, "footerNote") && <p className="tpl-team-note">{str(d, "footerNote")}</p>}
    </ContentArea>
  ),
};
