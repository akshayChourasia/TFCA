export type SheetSize = { trimW: number; trimH: number; bleed: number };

/** A4 trim with 3 mm bleed: the 2026 issue's format and the default print spec. */
export const A4: SheetSize = { trimW: 210, trimH: 297, bleed: 3 };

/** Content area inside the standard frame, in mm from the trim edge (5 mm+ safe margin). */
export const CONTENT = { top: 24, bottom: 24, inner: 15, outer: 13 };
