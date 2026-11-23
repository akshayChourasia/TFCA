import { notFound } from "next/navigation";
import { loadInvoice } from "@/lib/invoice-data";
import { verifyRender } from "@/lib/render-token";
import { InvoiceDocument } from "@/components/InvoiceDocument";

export const dynamic = "force-dynamic";

/** Bare invoice opened by headless Chromium for the PDF. */
export default async function RenderInvoice(props: PageProps<"/render/invoice/[invoiceId]">) {
  const { invoiceId } = await props.params;
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const orgId = verifyRender(token, `invoice:${invoiceId}`);
  if (!orgId) notFound();
  const data = await loadInvoice(orgId, invoiceId);
  if (!data) notFound();
  return (
    <>
      <style>{"@page { size: A4; margin: 0; } html, body { margin: 0; background: #fff; }"}</style>
      <InvoiceDocument data={data} kind={data.invoice.paidAt ? "receipt" : "invoice"} />
    </>
  );
}
