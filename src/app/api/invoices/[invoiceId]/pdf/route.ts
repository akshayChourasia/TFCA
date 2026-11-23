import { NextResponse, type NextRequest } from "next/server";
import { getCurrentOrg } from "@/lib/org";
import { loadInvoice } from "@/lib/invoice-data";
import { renderDocumentPdf } from "@/lib/pdf";

export const runtime = "nodejs";

/** GET /api/invoices/:id/pdf → the invoice, or the receipt once payment is recorded. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/invoices/[invoiceId]/pdf">) {
  const { invoiceId } = await ctx.params;
  const org = await getCurrentOrg();
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
