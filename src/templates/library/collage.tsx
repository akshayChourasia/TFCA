import type { TemplateDef } from "../types";
import { ContentArea, Img, list, str } from "../parts";

export const collage: TemplateDef = {
  key: "collage",
  name: "Photo collage",
  description: "Event photos in an automatic grid with a title and captions.",
  frame: "standard",
  defaultSection: "Community",
  fields: [
    { key: "title", label: "Title", type: "text" },
    {
      key: "photos",
      label: "Photos",
      type: "list",
      itemLabel: "Photo",
      itemFields: [
        { key: "src", label: "Photo", type: "image" },
        { key: "caption", label: "Caption", type: "text" },
      ],
    },
  ],
  defaults: { title: "", photos: [] },
  titleOf: (d) => str(d, "title") || "Photo collage",
  render: (d, ctx) => {
    const photos = list<{ src: string; caption: string }>(d, "photos");
    const n = Math.max(photos.length, 1);
    const cols = n <= 2 ? 1 : n <= 6 ? 2 : 3;
    return (
      <ContentArea even={ctx.pageNumber % 2 === 0}>
        <div className="tpl-collage">
          {str(d, "title") && <h1 className="tpl-collage-title">{str(d, "title")}</h1>}
          <div className="tpl-collage-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {(photos.length ? photos : [{ src: "", caption: "" }]).map((p, i) => (
              <figure key={i}>
                <Img src={p.src} label={`Photo ${i + 1}`} style={{ width: "100%", height: "100%" }} />
                {p.caption && <figcaption>{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      </ContentArea>
    );
  },
};
