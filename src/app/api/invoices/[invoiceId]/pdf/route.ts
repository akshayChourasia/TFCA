import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { loadInvoice } from "@/lib/invoice-data";
import { renderDocumentPdf } from "@/lib/pdf";

export const runtime = "nodejs";

/** GET /api/invoices/:id/pdf → the invoice, or the receipt once payment is recorded. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/invoices/[invoiceId]/pdf">) {
  const { invoiceId } = await ctx.params;
  let org;
  try {
    org = (await requirePermission("ads.manage")).org;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
  const data = await loadInvoice(org.id, invoiceId);
  if (!data) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const origin = process.env.RENDER_ORIGIN || req.nextUrl.origin;
  const pdf = await renderDocumentPdf(origin, org.id, `invoice:${invoiceId}`, `/render/invoice/${invoiceId}`);
  const kind = data.invoice.paidAt ? "Receipt" : "Invoice";
  const name = `${kind}-${data.invoice.number.replace(/\//g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
