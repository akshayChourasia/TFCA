import type { TemplateDef } from "../types";
import { ContentArea, str } from "../parts";

/** Contents list built automatically from the page order. */
export const contents: TemplateDef = {
  key: "contents",
  name: "Contents",
  description: "Built automatically from the titles and order of the other pages.",
  frame: "standard",
  defaultSection: "अनुक्रमणिका",
  fields: [{ key: "title", label: "Title", type: "text" }],
  defaults: { title: "अनुक्रमणिका" },
  titleOf: () => "Contents",
  render: (d, ctx) => (
    <ContentArea even={ctx.pageNumber % 2 === 0}>
      <h1 className="tpl-collage-title">{str(d, "title")}</h1>
      <ol className="tpl-contents">
        {ctx.contents.map((c, i) => (
          <li key={i}>
            <span className="tpl-contents-title">{c.title}</span>
            <span className="tpl-contents-dots" />
            <span className="tpl-contents-num">{String(c.pageNumber).padStart(2, "0")}</span>
          </li>
        ))}
      </ol>
    </ContentArea>
  ),
};
