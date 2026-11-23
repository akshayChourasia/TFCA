import type { TemplateDef } from "./types";
import { cover } from "./library/cover";
import { contents } from "./library/contents";
import { team } from "./library/team";
import { story } from "./library/story";
import { article } from "./library/article";
import { collage } from "./library/collage";
import { directory } from "./library/directory";
import { ads } from "./library/ads";

/** Starter template library. Each township can restyle these through its brand kit. */
export const TEMPLATES: TemplateDef[] = [cover, contents, team, story, article, collage, directory, ads];

export const templateByKey = (key: string): TemplateDef =>
  TEMPLATES.find((t) => t.key === key) ?? article;
