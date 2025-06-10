
export interface ExportDocumentItem {
  id: string; // Unique ID for the line item itself
  sizeId: string;
  productId: string;
  boxes: number;
  rate: number; // Rate per unit (e.g., Sqmt or Box, context dependent)
  // Calculated fields
  quantitySqmt?: number; // If applicable based on size
  amount?: number;
}

export interface ExportDocument {
  id: string; // Unique ID for the export document
  purchaseOrderId: string; // Reference to the source Purchase Order
  performaInvoiceId?: string; // Reference to the source Performa Invoice (if available via PO)
  
  exportInvoiceNumber: string; // Editable
  exportInvoiceDate: Date;
  
  exporterId: string;
  clientId: string;
  manufacturerId: string; // To get Manufacturer's GST

  vesselFlightNo?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination: string; // From PI
  countryOfOrigin?: string; // Typically Exporter's country
  countryOfFinalDestination?: string; // From PI, can be reconfirmed

  shippingMarks?: string;
  gstNumber: string; // Manufacturer's GST

  currencyType: "INR" | "USD" | "Euro"; // From PI
  selectedBankId?: string; // From PI's bank

  notifyPartyLine1?: string; // From PI
  notifyPartyLine2?: string; // From PI

  items: ExportDocumentItem[];
  
  // Calculated overall totals
  subTotal?: number;
  grandTotal?: number; // Total invoice value for export

  // Add any other specific export document fields as needed
  // e.g., terms of delivery (FOB, CIF), packing details, etc.
}
