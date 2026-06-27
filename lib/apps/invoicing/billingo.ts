import "server-only";
import type { InvoicingProvider, InvoicePayload, InvoiceResult, NavStatus } from "@/lib/apps/types";

const BILLINGO_API = "https://api.billingo.hu/v3";

export class BillingoProvider implements InvoicingProvider {
  readonly slug = "billingo";
  readonly category = "invoicing" as const;

  constructor(private readonly apiKey: string) {}

  async issueInvoice(payload: InvoicePayload): Promise<InvoiceResult> {
    const body = {
      vendor_id: null,          // uses default from account
      partner: {
        name: payload.customerName,
        taxcode: payload.customerTaxNumber ?? undefined,
        emails: payload.customerEmail ? [payload.customerEmail] : undefined,
      },
      block_id: null,           // default invoice block
      bank_account_id: null,
      type: "invoice",
      fulfillment_date: new Date().toISOString().split("T")[0],
      due_date: new Date().toISOString().split("T")[0],
      payment_method: "transfer",
      language: "hu",
      currency: "HUF",
      items: payload.items.map(i => ({
        name: i.description,
        quantity: i.quantity,
        quantity_type: "db",
        unit_price: i.unitPrice,
        unit_price_type: "net",
        vat: `${i.vatRate}%`,
        comment: null,
      })),
      settings: {
        mediated_service: false,
        without_financial_fulfillment: false,
        online_payment: null,
        round: "five",
        place_id: 0,
        instant_payment: false,
      },
    };

    const res = await fetch(`${BILLINGO_API}/documents`, {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Billingo API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return {
      externalId: String(data.id),
      invoiceNumber: data.invoice_number ?? "",
      pdfUrl: data.public_url ?? undefined,
      navStatus: "pending",
    };
  }

  async getStatus(externalId: string): Promise<NavStatus> {
    const res = await fetch(`${BILLINGO_API}/documents/${externalId}`, {
      headers: { "X-API-KEY": this.apiKey },
    });
    if (!res.ok) return { status: "error", error: `HTTP ${res.status}` };
    const data = await res.json();
    const navStatus = data.nav_state === "DONE" ? "done" : data.nav_state === "ERROR" ? "error" : "pending";
    return { status: navStatus, error: data.nav_error_code ?? undefined };
  }
}
