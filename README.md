# Magazine Studio

A web app where a township team creates its annual magazine end to end: plan the
issue, fill page templates, preview every page exactly as printed, and export a
press-ready PDF for the printer plus a small PDF for WhatsApp. Built for TFCA's
*Treasure Ki Abhivyakti* and designed to serve other townships too (every record
belongs to an organisation).

## What works today

- **Issues and flatplan** – every page as a real thumbnail, shown as reader
  spreads; add, reorder and delete pages; warning when the page count is not a
  multiple of 4 (saddle stitch).
- **Templates from the 2026 issue** – cover, contents (automatic), team credits
  (from the team roster), "Beyond Treasure" profile story (two columns, pull
  quotes, Q&A), article, photo collage, telephone directory (from members who
  opted in) and ad pages (full, half, quarter). Shared header band and footer
  with page number and masthead.
- **Page editor** – form on the left, live A4 preview on the right, overflow
  warning when text does not fit, image upload, page status
  (draft → proofreading → approved → locked).
- **PDF export**
  - *Print*: headless Chromium (correct Devanagari shaping) → Ghostscript
    CMYK PDF/X‑3 with embedded fonts, 3 mm bleed, TrimBox/BleedBox set.
  - *Digital*: RGB, images downsampled to ~150 dpi for WhatsApp.
  - *Preflight* blocks export on missing images, images under 300 dpi
    (print), text overflow and page count; unapproved pages are warnings.
    Admins can override.
- **Brand kit per township** – masthead lines, colours and fonts.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Postgres + Drizzle ORM ·
Playwright (Chromium) for PDF · Ghostscript for CMYK/PDF‑X · pdf-lib for print
boxes · open-licence fonts Noto Serif Devanagari and Mukta (bundled).

## Run locally

Requirements: Node 20+, Postgres 14+, Ghostscript, a Chromium binary
(`npx playwright install chromium`, or set `CHROMIUM_PATH`).

```bash
cp .env.example .env.local      # adjust DATABASE_URL
npm install
npm run db:migrate              # create tables
npm run db:seed                 # TFCA + sample 2027 issue (sample data only)
npm run dev                     # http://localhost:3000
```

## Code map

| Path | What |
| --- | --- |
| `src/db/schema.ts` | Data model (organisations, team, members, issues, pages, content, media, advertisers, rate card, bookings, invoices) |
| `src/templates/` | Page geometry, frame, shared parts and the template library |
| `src/lib/pdf.ts` | Render → preflight → PDF/X pipeline |
| `src/app/(studio)/` | Studio screens and server actions |
| `src/app/render/` | Bare page list that Chromium prints (signed URL) |

## Next up

Phone-OTP login and roles, content inbox with editorial board, advertisers
(bookings, invoices and receipts with offline payment recording), members
import, free-form page mode (drag and drop), text flowing onto a continuation
page, Supabase Storage for uploads, printer pack download.
