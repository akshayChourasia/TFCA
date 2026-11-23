import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import { loadInvoice } from "@/lib/invoice-data";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { PaymentForm } from "@/components/PaymentForm";
import { inr } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function InvoicePage(props: PageProps<"/invoices/[invoiceId]">) {
  const { invoiceId } = await props.params;
  const org = await getCurrentOrg();
  const data = await loadInvoice(org.id, invoiceId);
  if (!data) notFound();
  const { invoice, advertiser, issue } = data;
  const paid = !!invoice.paidAt;
  const waText = encodeURIComponent(
    paid
      ? `Thank you ${advertiser.businessName}! We have received ${inr(invoice.amountInr)} for your ad in ${issue.title} ${issue.year}. Receipt no. ${invoice.number}.`
      : `Namaste ${advertiser.businessName}, here is invoice no. ${invoice.number} for ${inr(invoice.amountInr)} for your ad in ${issue.title} ${issue.year}.`,
  );
  const waPhone = (advertiser.phone ?? "").replace(/\D/g, "").replace(/^(\d{10})$/, "91$1");

  return (
    <div className="p-8">
      <Link href={`/issues/${issue.id}/ads`} className="text-sm text-neutral-500 hover:underline">← Ads & invoices</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {paid ? "Receipt" : "Invoice"} {invoice.number}
        </h1>
        <span className={`rounded px-2 py-0.5 text-sm ${paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {paid ? "Paid" : "Unpaid"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <a href={`/api/invoices/${invoice.id}/pdf`} className="rounded bg-[#8b1e2d] px-4 py-2 font-semibold text-white">
          Download {paid ? "receipt" : "invoice"} PDF
        </a>
        {waPhone && (
          <a
            href={`https://wa.me/${waPhone}?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-emerald-700 px-4 py-2 font-semibold text-emerald-800"
            title="Opens WhatsApp with a message; attach the PDF you downloaded"
          >
            Message on WhatsApp
          </a>
        )}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[auto_320px] items-start">
        <div className="overflow-auto">
          <div className="shadow-lg inline-block">
            <InvoiceDocument data={data} kind={paid ? "receipt" : "invoice"} />
          </div>
        </div>
        <PaymentForm invoiceId={invoice.id} paid={paid} />
      </div>
    </div>
  );
}
