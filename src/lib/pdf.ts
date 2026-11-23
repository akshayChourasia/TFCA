import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";
import { A4 } from "@/templates/geometry";
import type { LoadedIssue } from "./issue-data";
import { signRender } from "./render-token";

const run = promisify(execFile);
const MM_TO_PT = 72 / 25.4;

export type PdfMode = "print" | "digital";

export type PreflightIssue = {
  level: "error" | "warning";
  page: number | null;
  message: string;
};

/** Checks that need only the stored data (no rendering). */
export function preflightData(loaded: LoadedIssue, mode: PdfMode): PreflightIssue[] {
  const out: PreflightIssue[] = [];
  const n = loaded.pages.length;
  if (n === 0) out.push({ level: "error", page: null, message: "The issue has no pages." });
  if (mode === "print" && n % 4 !== 0) {
    const add = 4 - (n % 4);
    out.push({
      level: "error",
      page: null,
      message: `Saddle-stitch needs a page count that is a multiple of 4. The issue has ${n}; add ${add} page${add > 1 ? "s" : ""} (an ad, a photo page or a notes page).`,
    });
  }
  for (const p of loaded.pages) {
    if (p.status !== "approved" && p.status !== "locked") {
      out.push({ level: "warning", page: p.pageNumber, message: `"${p.title}" is not approved yet (${p.status}).` });
    }
  }
  return out;
}

type RenderFindings = {
  overflow: number[];
  missing: { page: number; label: string }[];
  images: { page: number; dpi: number; src: string }[];
};

/**
 * Renders the issue with headless Chromium (correct Devanagari shaping), runs
 * the layout checks in the page, and returns the raw RGB PDF.
 */
async function renderWithChromium(origin: string, orgId: string, issueId: string, mode: PdfMode) {
  const token = signRender(orgId, issueId);
  const url = `${origin}/render/${issueId}?mode=${mode}&token=${encodeURIComponent(token)}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    if (!res || !res.ok()) throw new Error(`Render page failed: ${res?.status()}`);
    await page.evaluate(() => document.fonts.ready);

    const findings = await page.evaluate((): RenderFindings => {
      const pageOf = (el: Element) => Number((el.closest(".mag-sheet") as HTMLElement | null)?.dataset.page ?? 0);
      const overflow = Array.from(document.querySelectorAll<HTMLElement>("[data-overflow-check]"))
        .filter((el) => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)
        .map(pageOf);
      const missing = Array.from(document.querySelectorAll<HTMLElement>("[data-missing-image]")).map((el) => ({
        page: pageOf(el),
        label: el.dataset.missingImage ?? "image",
      }));
      const pxPerMm = 96 / 25.4;
      const images = Array.from(document.querySelectorAll<HTMLImageElement>(".mag-sheet img"))
        .filter((img) => img.naturalWidth > 0)
        .map((img) => {
          const r = img.getBoundingClientRect();
          const widthIn = r.width / pxPerMm / 25.4;
          const heightIn = r.height / pxPerMm / 25.4;
          // object-fit: cover scales by the larger ratio, so effective dpi is the smaller one.
          const dpi = Math.min(img.naturalWidth / Math.max(widthIn, 0.01), img.naturalHeight / Math.max(heightIn, 0.01));
          return { page: pageOf(img), dpi: Math.round(dpi), src: img.currentSrc.slice(0, 120) };
        });
      return { overflow, missing, images };
    });

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    return { pdf: Buffer.from(pdf), findings };
  } finally {
    await browser.close();
  }
}

function findingsToPreflight(f: RenderFindings, mode: PdfMode): PreflightIssue[] {
  const out: PreflightIssue[] = [];
  for (const p of new Set(f.overflow)) {
    out.push({ level: "error", page: p, message: "Text does not fit on this page. Shorten it or continue it on another page." });
  }
  for (const m of f.missing) {
    out.push({ level: mode === "print" ? "error" : "warning", page: m.page, message: `Missing image: ${m.label}.` });
  }
  if (mode === "print") {
    for (const img of f.images) {
      if (img.dpi < 300) {
        out.push({
          level: "error",
          page: img.page,
          message: `Image is ${img.dpi} dpi at its printed size; print needs 300 dpi. Use a larger original or make it smaller on the page.`,
        });
      }
    }
  }
  return out;
}

/** Press-ready PDF/X (CMYK, trim and bleed boxes set) via Ghostscript. */
async function toPrintPdfX(input: string, output: string, title: string) {
  const gs = process.env.GS_PATH || "gs";
  const icc = process.env.PRINT_ICC_PROFILE || (await findGsFile("iccprofiles/default_cmyk.icc"));
  const dir = path.dirname(output);
  const defPs = path.join(dir, "pdfx_def.ps");
  await writeFile(defPs, pdfxDef(icc, title));
  await run(gs, [
    "-dPDFX",
    "-dBATCH",
    "-dNOPAUSE",
    "-dNOSAFER",
    "-sDEVICE=pdfwrite",
    "-sColorConversionStrategy=CMYK",
    "-sProcessColorModel=DeviceCMYK",
    "-dPDFXCompatibilityPolicy=1",
    "-dEmbedAllFonts=true",
    "-dSubsetFonts=true",
    "-dDownsampleColorImages=false",
    `-sOutputFile=${output}`,
    defPs,
    input,
  ]);
  await setPrintBoxes(output);
}

/** Marks where the printer trims: TrimBox is the media inset by the bleed; BleedBox is the full sheet. */
async function setPrintBoxes(file: string) {
  const doc = await PDFDocument.load(await readFile(file));
  const b = A4.bleed * MM_TO_PT;
  for (const page of doc.getPages()) {
    const { width, height } = page.getMediaBox();
    page.setBleedBox(0, 0, width, height);
    page.setTrimBox(b, b, width - 2 * b, height - 2 * b);
  }
  await writeFile(file, await doc.save({ useObjectStreams: false }));
}

/** Small RGB PDF for WhatsApp: images downsampled to ~150 dpi. */
async function toDigitalPdf(input: string, output: string) {
  const gs = process.env.GS_PATH || "gs";
  await run(gs, [
    "-dBATCH",
    "-dNOPAUSE",
    "-dSAFER",
    "-sDEVICE=pdfwrite",
    "-dPDFSETTINGS=/ebook",
    "-dEmbedAllFonts=true",
    "-dSubsetFonts=true",
    `-sOutputFile=${output}`,
    input,
  ]);
}

async function findGsFile(rel: string) {
  const { stdout } = await run(process.env.GS_PATH || "gs", ["--version"]);
  return `/usr/share/ghostscript/${stdout.trim()}/${rel}`;
}

const psString = (s: string) => `(${s.replace(/[()\\]/g, (c) => `\\${c}`)})`;

function pdfxDef(iccPath: string, title: string) {
  return `%!
[ /GTS_PDFXVersion (PDF/X-3:2002) /Title ${psString(title)} /Trapped /False /DOCINFO pdfmark
/ICCProfile ${psString(iccPath)} def
[/_objdef {icc_PDFX} /type /stream /OBJ pdfmark
[{icc_PDFX} << /N 4 >> /PUT pdfmark
[{icc_PDFX} ICCProfile (r) file /PUT pdfmark
[/_objdef {OutputIntent_PDFX} /type /dict /OBJ pdfmark
[{OutputIntent_PDFX} <<
  /Type /OutputIntent /S /GTS_PDFX
  /OutputCondition (Commercial and specialty printing)
  /Info (none) /OutputConditionIdentifier (CGATS TR001)
  /RegistryName (http://www.color.org)
  /DestOutputProfile {icc_PDFX}
>> /PUT pdfmark
[{Catalog} <</OutputIntents [ {OutputIntent_PDFX} ]>> /PUT pdfmark
`;
}

export async function exportIssuePdf(opts: {
  origin: string;
  loaded: LoadedIssue;
  mode: PdfMode;
  force?: boolean;
}): Promise<{ ok: true; pdf: Buffer; preflight: PreflightIssue[] } | { ok: false; preflight: PreflightIssue[] }> {
  const { loaded, mode } = opts;
  const pre = preflightData(loaded, mode);
  if (!opts.force && pre.some((p) => p.level === "error")) return { ok: false, preflight: pre };

  const { pdf, findings } = await renderWithChromium(opts.origin, loaded.org.id, loaded.issue.id, mode);
  const preflight = [...pre, ...findingsToPreflight(findings, mode)].sort((a, b) => (a.page ?? 0) - (b.page ?? 0));
  if (!opts.force && preflight.some((p) => p.level === "error")) return { ok: false, preflight };

  const dir = await mkdtemp(path.join(tmpdir(), "mag-pdf-"));
  try {
    const raw = path.join(dir, "raw.pdf");
    const out = path.join(dir, "out.pdf");
    await writeFile(raw, pdf);
    if (mode === "print") await toPrintPdfX(raw, out, `${loaded.issue.title} ${loaded.issue.year}`);
    else await toDigitalPdf(raw, out);
    return { ok: true, pdf: await readFile(out), preflight };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Prints a single internal page (e.g. an invoice) to an A4 PDF. */
export async function renderDocumentPdf(origin: string, orgId: string, resource: string, pathName: string) {
  const token = signRender(orgId, resource);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    const res = await page.goto(`${origin}${pathName}?token=${encodeURIComponent(token)}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    if (!res || !res.ok()) throw new Error(`Render page failed: ${res?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } finally {
    await browser.close();
  }
}
