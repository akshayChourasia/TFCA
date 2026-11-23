/** Per-township look: masthead, colours and fonts. Stored on the organisation. */
export type BrandKit = {
  /** Masthead lines, e.g. ["TFCA's", "TREASURE KI", "अभिव्यक्ति"]. Last line is the large Devanagari word. */
  masthead: string[];
  tagline: string;
  logoUrl?: string;
  colors: {
    primary: string; // deep maroon used for headings and bars
    band: string; // light header/footer band
    accent: string; // pull quotes, numbers
    text: string;
  };
  fonts: {
    body: string;
    heading: string;
  };
};

export const defaultBrand: BrandKit = {
  masthead: ["TFCA's", "TREASURE KI", "अभिव्यक्ति"],
  tagline: "THE COMMUNITY MAGAZINE",
  colors: {
    primary: "#8b1e2d",
    band: "#bcd8f2",
    accent: "#1f5fa8",
    text: "#1d1d1f",
  },
  fonts: {
    body: "'Noto Serif Devanagari', serif",
    heading: "'Mukta', 'Noto Serif Devanagari', sans-serif",
  },
};
