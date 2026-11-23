import type { TemplateDef } from "../types";
import { ContentArea, Img, Prose, str } from "../parts";

export const article: TemplateDef = {
  key: "article",
  name: "Article",
  description: "Knowledge or culture article: headline, author, optional image, two columns.",
  frame: "standard",
  defaultSection: "Knowledge",
  fields: [
    { key: "title", label: "Headline", type: "text" },
    { key: "author", label: "Author", type: "text" },
    { key: "image", label: "Image", type: "image" },
    { key: "columns", label: "Columns", type: "select", options: [{ value: "2", label: "Two columns" }, { value: "1", label: "One column" }] },
    { key: "body", label: "Text", type: "textarea", rows: 16, help: "Blank line = new paragraph · ## Sub-heading · > Pull quote · - Bullet" },
  ],
  defaults: { title: "", author: "", image: "", columns: "2", body: "" },
  titleOf: (d) => str(d, "title") || "Article",
  render: (d, ctx) => (
    <ContentArea even={ctx.pageNumber % 2 === 0}>
      <div className="tpl-story">
        <header className="tpl-story-head">
          <h1>{str(d, "title")}</h1>
          {str(d, "author") && <div className="tpl-story-role">— {str(d, "author")}</div>}
        </header>
        {str(d, "image") && <Img src={str(d, "image")} label="Image" style={{ width: "100%", height: "70mm", marginBottom: "4mm" }} />}
        <div className={str(d, "columns", "2") === "2" ? "mag-columns" : "mag-onecol"}>
          <div className="mag-prose">
            <Prose text={str(d, "body")} />
          </div>
        </div>
      </div>
    </ContentArea>
  ),
};
