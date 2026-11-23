import type { ReactNode } from "react";
import type { BrandKit } from "@/lib/brand";

/** A field the team fills in for a template page. Drives the editor form. */
export type FieldDef =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "textarea"; rows?: number; help?: string }
  | { key: string; label: string; type: "image"; help?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | {
      key: string;
      label: string;
      type: "list";
      itemLabel: string;
      itemFields: Exclude<FieldDef, { type: "list" }>[];
    };

/** A positioned element on a page in free mode. Units are millimetres from the trim edge. */
export type Box = {
  id: string;
  kind: "text" | "image" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  z?: number;
  text?: string;
  /** pt */
  fontSize?: number;
  font?: "body" | "heading";
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  src?: string;
  fill?: string;
  /** mm */
  radius?: number;
};

export type DirectoryEntry = { name: string; unit: string | null; phone: string | null };
export type TeamEntry = { name: string; creditTitle: string | null; creditQuote: string | null; photoUrl: string | null };
export type ContentsEntry = { title: string; pageNumber: number; section: string | null };

/** Everything a template may need besides its own fields. */
export type RenderContext = {
  brand: BrandKit;
  pageNumber: number;
  section: string | null;
  issue: { title: string; year: number; editionLabel: string | null };
  directory: DirectoryEntry[];
  team: TeamEntry[];
  contents: ContentsEntry[];
};

export type TemplateDef = {
  key: string;
  name: string;
  description: string;
  /** Pages like the cover have no header band or footer. */
  frame: "none" | "standard";
  /** Default section label shown in the header band. */
  defaultSection?: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  /** Title used in the contents page and the flatplan. */
  titleOf: (data: Record<string, unknown>) => string;
  render: (data: Record<string, unknown>, ctx: RenderContext) => ReactNode;
};
