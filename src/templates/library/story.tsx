import type { TemplateDef } from "../types";
import { ContentArea, Img, Prose, list, str } from "../parts";

/** "Beyond Treasure" resident profile: two-column story, pull quotes, photo and Quick Questions. */
export const story: TemplateDef = {
  key: "story",
  name: "Profile story",
  description: "Two-column Devanagari story with sub-headings, pull quotes, a photo and a Q&A box.",
  frame: "standard",
  defaultSection: "Beyond Treasure...",
  fields: [
    { key: "title", label: "Headline", type: "text" },
    { key: "personName", label: "Person's name", type: "text" },
    { key: "personRole", label: "Role / place", type: "text" },
    { key: "leadQuote", label: "Lead quote", type: "textarea", rows: 2 },
    { key: "photo", label: "Photo", type: "image" },
    { key: "photoCaption", label: "Photo caption", type: "text" },
    {
      key: "body",
      label: "Story",
      type: "textarea",
      rows: 14,
      help: "Blank line = new paragraph · ## Sub-heading · > Pull quote · - Bullet",
    },
    {
      key: "qa",
      label: "Quick questions",
      type: "list",
      itemLabel: "Question",
      itemFields: [
        { key: "q", label: "Question", type: "text" },
        { key: "a", label: "Answer", type: "textarea", rows: 2 },
      ],
    },
  ],
  defaults: {
    title: "संघर्ष से सफलता तक...",
    personName: "",
    personRole: "",
    leadQuote: "",
    photo: "",
    photoCaption: "",
    body: "",
    qa: [],
  },
  titleOf: (d) => str(d, "personName") || str(d, "title") || "Profile story",
  render: (d, ctx) => {
    const qa = list<{ q: string; a: string }>(d, "qa");
    return (
      <ContentArea even={ctx.pageNumber % 2 === 0}>
        <div className="tpl-story">
          <header className="tpl-story-head">
            <h1>{str(d, "title")}</h1>
            {str(d, "personName") && <h2>{str(d, "personName")}</h2>}
            {str(d, "personRole") && <div className="tpl-story-role">{str(d, "personRole")}</div>}
            {str(d, "leadQuote") && <blockquote className="mag-pullquote">“{str(d, "leadQuote")}”</blockquote>}
          </header>
          <div className="mag-columns">
            {(str(d, "photo") || str(d, "photoCaption")) && (
              <figure className="tpl-story-photo">
                <Img src={str(d, "photo")} label="Photo" style={{ width: "100%", height: "62mm" }} />
                {str(d, "photoCaption") && <figcaption>{str(d, "photoCaption")}</figcaption>}
              </figure>
            )}
            <div className="mag-prose">
              <Prose text={str(d, "body")} />
            </div>
            {qa.length > 0 && (
              <section className="tpl-qa">
                <h4>QUICK QUESTIONS</h4>
                {qa.map((item, i) => (
                  <div key={i}>
                    <div className="tpl-qa-q">
                      Q{i + 1}. {item.q}
                    </div>
                    <div className="tpl-qa-a">{item.a}</div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </ContentArea>
    );
  },
};
