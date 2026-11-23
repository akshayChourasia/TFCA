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
- **Free editing** – unlock any page to drag, resize and layer text, image
  and shape boxes (mm units, snapping, arrow-key nudge, safe-margin guide),
  on top of the template's content or on a blank page; reset to the template
  at any time.
- **PDF export**
  - *Print*: headless Chromium (correct Devanagari shaping) → Ghostscript
    CMYK PDF/X‑3 with embedded fonts, 3 mm bleed, TrimBox/BleedBox set.
  - *Digital*: RGB, images downsampled to ~150 dpi for WhatsApp.
  - *Preflight* blocks export on missing images, images under 300 dpi
    (print), text overflow and page count; unapproved pages are warnings.
    Admins can override.
- **Advertiser CRM** – advertiser directory with billed and due totals; rate
  card per issue; bookings with status, price, artwork upload and placement on
  an ad page (the page updates with the artwork); invoices numbered
  `TFCA/2027/001` as A4 PDFs; payment stays offline and is recorded (cash, UPI,
  cheque, bank) which turns the invoice into a receipt; WhatsApp message link.
- **Brand kit per township** – masthead lines, colours and fonts.
- **Login and roles** – mobile number + password. Admins add team members on
  *Team & logins*; each gets a temporary password (with a WhatsApp link to
  send it) and sets their own on first login. Admins can reset passwords,
  change roles and deactivate logins, and the last active admin is protected.
  Roles: admin, chief editor, editor, proofreader, designer, ad manager,
  viewer (see `src/lib/roles.ts`). Sessions last 30 days; 5 wrong passwords
  lock that number for 15 minutes.

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

The seed creates an admin with mobile `9000000000`. Set `SEED_ADMIN_PASSWORD`
to choose its password; otherwise the seed prints a temporary one that must be
changed on first login.

## Code map

| Path | What |
| --- | --- |
| `src/db/schema.ts` | Data model (organisations, team, members, issues, pages, content, media, advertisers, rate card, bookings, invoices) |
| `src/templates/` | Page geometry, frame, shared parts and the template library |
| `src/lib/pdf.ts` | Render → preflight → PDF/X pipeline |
| `src/app/(studio)/` | Studio screens and server actions |
| `src/lib/auth.ts`, `src/lib/roles.ts` | Sessions, login throttle and the role → permission matrix |
| `src/app/render/` | Bare page list that Chromium prints (signed URL) |

## Next up

Content inbox with editorial board, members
import, renewal reminders for last year's advertisers, text flowing onto a continuation
page, Supabase Storage for uploads, printer pack download.
