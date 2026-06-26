// Connector interfész (rendszerterv 11) — T-31 implementálja a tényleges providereket

export type AppCategory = "invoicing" | "calendar" | "payment" | "messaging" | "accounting";

export interface Connector {
  slug: string;
  category: AppCategory;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface InvoicePayload {
  idempotencyKey: string;
  customerName: string;
  customerTaxNumber?: string;
  customerEmail?: string;
  items: InvoiceLineItem[];
  issuerCompanyId: string;
}

export interface InvoiceResult {
  externalId: string;
  invoiceNumber: string;
  pdfUrl?: string;
  navStatus: "pending" | "done" | "error";
}

export interface NavStatus {
  status: "pending" | "done" | "error";
  error?: string;
}

export interface InvoicingProvider extends Connector {
  category: "invoicing";
  issueInvoice(payload: InvoicePayload): Promise<InvoiceResult>;
  getStatus(externalId: string): Promise<NavStatus>;
}

export interface BusySlot {
  start: Date;
  end: Date;
}

export interface CalendarEvent {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}

export interface CalendarProvider extends Connector {
  category: "calendar";
  pushEvent(userId: string, event: CalendarEvent): Promise<{ externalId: string }>;
  updateEvent(externalId: string, event: CalendarEvent): Promise<void>;
  deleteEvent(externalId: string): Promise<void>;
  listBusy(userId: string, from: Date, to: Date): Promise<BusySlot[]>;
}

export interface ChargePayload {
  amount: number;
  currency: string;
  description: string;
  customerId?: string;
}

export interface ChargeResult {
  chargeId: string;
  status: "succeeded" | "pending" | "failed";
}

export interface PaymentProvider extends Connector {
  category: "payment";
  createCharge(payload: ChargePayload): Promise<ChargeResult>;
  refund(chargeId: string): Promise<void>;
}
