import type { TemplateDef } from "../types";
import { ContentArea, str } from "../parts";

/** Telephone directory generated from the member database (only members who opted in). */
export const directory: TemplateDef = {
  key: "directory",
  name: "Telephone directory",
  description: "Generated from Members. Edit members, not this page.",
  frame: "standard",
  defaultSection: "Directory",
  fields: [
    { key: "title", label: "Title", type: "text" },
    { key: "from", label: "Start at entry no.", type: "text", placeholder: "1" },
    { key: "count", label: "Entries on this page", type: "text", placeholder: "60" },
  ],
  defaults: { title: "टेलीफोन डायरेक्टरी", from: "1", count: "60" },
  titleOf: (d) => str(d, "title") || "Directory",
  render: (d, ctx) => {
    const from = Math.max(1, parseInt(str(d, "from", "1"), 10) || 1);
    const count = Math.max(1, parseInt(str(d, "count", "60"), 10) || 60);
    const rows = ctx.directory.slice(from - 1, from - 1 + count);
    return (
      <ContentArea even={ctx.pageNumber % 2 === 0}>
        <h1 className="tpl-collage-title">{str(d, "title")}</h1>
        <table className="tpl-directory">
          <thead>
            <tr>
              <th>#</th>
              <th>नाम</th>
              <th>यूनिट</th>
              <th>फ़ोन</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{from + i}</td>
                <td>{r.name}</td>
                <td>{r.unit}</td>
                <td>{r.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ContentArea>
    );
  },
};
