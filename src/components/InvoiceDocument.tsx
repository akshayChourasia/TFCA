import type { LoadedInvoice } from "@/lib/invoice-data";
import { SLOT_LABELS, inr, inrInWords } from "@/lib/money";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * A4 invoice. Once payment is recorded it doubles as the receipt.
 * Payment itself happens offline (cash, UPI, cheque); the team records it.
 */
export function InvoiceDocument({ data, kind }: { data: LoadedInvoice; kind: "invoice" | "receipt" }) {
  const { invoice, booking, advertiser, issue, org } = data;
  const b = org.billing;
  const primary = org.brand.colors.primary;
  const isReceipt = kind === "receipt" && invoice.paidAt;
  return (
    <div
      className="invoice-doc"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "18mm 18mm 16mm",
        boxSizing: "border-box",
        background: "#fff",
        color: "#1d1d1f",
        fontFamily: "'Mukta', 'Noto Serif Devanagari', sans-serif",
        fontSize: "10.5pt",
        lineHeight: 1.45,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1mm solid ${primary}`, paddingBottom: "5mm" }}>
        <div>
          <div style={{ fontSize: "18pt", fontWeight: 800, color: primary, lineHeight: 1.1 }}>{org.name}</div>
          {b.address && <div style={{ whiteSpace: "pre-line" }}>{b.address}</div>}
          <div>{[b.phone, b.email].filter(Boolean).join(" · ")}</div>
          {b.gstin && <div>GSTIN: {b.gstin}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "20pt", fontWeight: 800, letterSpacing: "0.08em" }}>{isReceipt ? "RECEIPT" : "INVOICE"}</div>
          <div>No. {invoice.number}</div>
          <div>Date: {fmtDate(invoice.issuedAt)}</div>
          {isReceipt && invoice.paidAt && <div>Paid on: {fmtDate(invoice.paidAt)}</div>}
        </div>
      </div>

      <div style={{ marginTop: "7mm" }}>
        <div style={{ fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
          {isReceipt ? "Received from" : "Bill to"}
        </div>
        <div style={{ fontSize: "13pt", fontWeight: 700 }}>{advertiser.businessName}</div>
        {advertiser.contactName && <div>{advertiser.contactName}</div>}
        {advertiser.address && <div style={{ whiteSpace: "pre-line" }}>{advertiser.address}</div>}
        {advertiser.phone && <div>{advertiser.phone}</div>}
        {advertiser.gstin && <div>GSTIN: {advertiser.gstin}</div>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8mm" }}>
        <thead>
          <tr style={{ background: primary, color: "#fff" }}>
            <th style={{ textAlign: "left", padding: "2mm 3mm" }}>Description</th>
            <th style={{ textAlign: "right", padding: "2mm 3mm", width: "40mm" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "0.3mm solid #ddd" }}>
            <td style={{ padding: "3mm" }}>
              {SLOT_LABELS[booking.slot]} advertisement
              <div style={{ color: "#555", fontSize: "9.5pt" }}>
                {issue.title} {issue.year}
                {issue.editionLabel ? ` · ${issue.editionLabel}` : ""}
              </div>
            </td>
            <td style={{ padding: "3mm", textAlign: "right" }}>{inr(invoice.amountInr)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: "3mm", textAlign: "right", fontWeight: 700 }}>Total</td>
            <td style={{ padding: "3mm", textAlign: "right", fontWeight: 800, fontSize: "13pt" }}>{inr(invoice.amountInr)}</td>
          </tr>
        </tfoot>
      </table>
      <div style={{ fontStyle: "italic", color: "#444" }}>{inrInWords(invoice.amountInr)}</div>

      {isReceipt ? (
        <div style={{ marginTop: "10mm", padding: "4mm", border: "0.5mm solid #16a34a", color: "#14532d", borderRadius: "2mm" }}>
          <strong>Payment received</strong> by {invoice.paymentMethod}
          {invoice.paymentRef ? ` (ref. ${invoice.paymentRef})` : ""} on {invoice.paidAt && fmtDate(invoice.paidAt)}. Thank you for supporting
          the magazine.
        </div>
      ) : (
        <div style={{ marginTop: "10mm" }}>
          <div style={{ fontWeight: 700 }}>How to pay</div>
          <div>Cash, UPI, cheque or bank transfer to the TFCA team.</div>
          {b.upiId && <div>UPI: {b.upiId}</div>}
          {b.bankDetails && <div style={{ whiteSpace: "pre-line" }}>{b.bankDetails}</div>}
          <div style={{ color: "#555" }}>Please mention invoice no. {invoice.number} with your payment.</div>
        </div>
      )}
      {invoice.notes && <div style={{ marginTop: "6mm", whiteSpace: "pre-line" }}>{invoice.notes}</div>}

      <div style={{ marginTop: "22mm", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ textAlign: "center", borderTop: "0.3mm solid #999", paddingTop: "1.5mm", width: "60mm" }}>For {org.shortName}</div>
      </div>
    </div>
  );
}
