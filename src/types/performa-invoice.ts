
export interface PerformaInvoiceItem {
  id: string; // Unique ID for the line item itself
  sizeId: string;
  productId: string;
  boxes: number;
  ratePerSqmt: number;
  commission: number;
  // Calculated fields, might not be stored directly if always derived
  quantitySqmt?: number; 
  amount?: number;
}

export interface PerformaInvoice {
  id: string; // Unique ID for the invoice
  exporterId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  clientId: string;
  finalDestination: string;
  totalContainer: number;
  containerSize: "20 ft" | "40 ft";
  currencyType: "INR" | "USD" | "Euro";
  totalGrossWeight: string; // Can be "NA" or a number as string
  freight: number;
  discount: number;
  notifyPartyLine1?: string;
  notifyPartyLine2?: string;
  termsAndConditions: string;
  note: string;
  items: PerformaInvoiceItem[];
  // Calculated overall totals
  subTotal?: number;
  grandTotal?: number; 
}
