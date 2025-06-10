
export interface ExportDocumentProductItem {
  id: string; // Unique ID for the product line item within a container
  sizeId: string;
  productId: string;
  boxes: number;
  ratePerSqmt: number; // From PI/PO, potentially editable in ED form for adjustments
  // Calculated fields, populated during form submission or display
  quantitySqmt?: number;
  amount?: number;
  netWtKgs?: number;
  grossWtKgs?: number; // Could be netWtKgs + packing, or manually entered
}

export interface ExportDocumentContainerItem {
  id: string; // Unique ID for the container item
  bookingNo?: string;
  containerNo?: string;
  lineSeal?: string;
  rfidSeal?: string;
  tareWeight?: number; // Kgs, user input
  startPalletNo?: string;
  endPalletNo?: string;
  description?: string; // Default "VITRIFIED TILES AS PER INVOICE"
  weighingDateTime?: Date | string; // Date object or string representation
  weighingSlipNo?: string;
  truckNumber?: string;
  biltiNo?: string;
  products: ExportDocumentProductItem[];
  // Calculated fields for this container
  totalNetWeightContainer?: number;
  totalGrossWeightContainer?: number;
  totalBoxesContainer?: number;
}

export interface ExportDocument {
  id: string; // Unique ID for the Export Document
  purchaseOrderId?: string; // ID of the source Purchase Order for pre-filling
  performaInvoiceId?: string; // ID of the source Performa Invoice (via PO) for pre-filling

  // Selected master data IDs
  exporterId?: string;
  clientId?: string;
  manufacturerId?: string;
  transporterId?: string; // New: ID of the selected transporter

  // Manufacturer-related details (editable on the form, pre-filled from selected manufacturer if applicable)
  manufacturerInvoiceNumber?: string; // New: User input for manufacturer's invoice number
  manufacturerInvoiceDate?: Date;     // New: User input for manufacturer's invoice date
  manufacturerGstNumber?: string;     // Pre-filled from selected Manufacturer, editable on the form
  stuffingPermissionNumber?: string;  // Pre-filled from selected Manufacturer, stored with the document

  // Export Invoice details (the actual export document's invoice)
  exportInvoiceNumber: string; // Auto-generated based on a new pattern, editable
  exportInvoiceDate: Date;     // Defaults to current date, editable

  // Shipment details
  vesselFlightNo?: string;
  portOfLoading?: string;     // Default "MUNDRA PORT, INDIA", editable
  finalDestination?: string;  // Pre-filled from PI (e.g., "JEBEL ALI, UAE"), editable
  countryOfOrigin?: string;   // Default "INDIA", editable
  countryOfFinalDestination?: string; // Pre-filled from Client's country (via PI)

  shippingMarks?: string;     // Default "AS PER INVOICE", editable

  // Financial details
  currencyType?: "INR" | "USD" | "Euro"; // Pre-filled from PI
  conversionRate?: number;    // New: User input for currency conversion rate
  exchangeRateNotificationNumber?: string; // New: User input
  exchangeRateDate?: Date;    // New: User input, defaults to current date

  freightAmount?: number;     // Pre-filled from PI's freight, editable
  termsOfDeliveryAndPayment?: string; // Pre-filled from PI's terms, editable

  containers: ExportDocumentContainerItem[];

  // Overall calculated totals for the document
  totalInvoiceValue?: number;
  overallTotalNetWeight?: number;
  overallTotalGrossWeight?: number;
  overallTotalBoxes?: number;
  overallTareWeight?: number;
  overallFinalGrossWeight?: number; // overallTotalGrossWeight + overallTareWeight
}
