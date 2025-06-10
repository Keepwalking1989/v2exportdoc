
export interface ExportDocumentProductItem {
  id: string; // Unique ID for the product line item within a container
  sizeId: string;
  productId: string;
  boxes: number;
  ratePerSqmt: number;
  quantitySqmt?: number;
  amount?: number;
  netWtKgs?: number;
  grossWtKgs?: number;
}

export interface ExportDocumentContainerItem {
  id: string; // Unique ID for the container item
  bookingNo?: string;
  containerNo?: string;
  lineSeal?: string;
  rfidSeal?: string;
  tareWeight?: number; // Kgs
  startPalletNo?: string;
  endPalletNo?: string;
  description?: string;
  weighingDateTime?: Date | string;
  weighingSlipNo?: string;
  truckNumber?: string;
  biltiNo?: string;
  products: ExportDocumentProductItem[];
  totalNetWeightContainer?: number;
  totalGrossWeightContainer?: number;
  totalBoxesContainer?: number;
}

export interface ExportDocument {
  id: string;
  purchaseOrderId?: string;
  performaInvoiceId?: string; // For reference and pre-filling PI-specific data

  // User-selectable IDs
  exporterId?: string;
  clientId?: string;
  manufacturerId?: string;
  transporterId?: string; // New

  // Manufacturer specific invoice details
  manufacturerInvoiceNumber?: string; // New
  manufacturerInvoiceDate?: Date; // New

  // Main Export Invoice details
  exportInvoiceNumber: string; // Will be auto-generated, editable
  exportInvoiceDate: Date; // New, distinct from manufacturerInvoiceDate

  // Shipment details
  vesselFlightNo?: string;
  portOfLoading?: string; // Will be pre-filled "Mundra", editable
  // portOfDischarge: removed
  finalDestination?: string; // From PI, editable
  countryOfOrigin?: string;
  countryOfFinalDestination?: string; // Pre-filled "India", editable

  shippingMarks?: string;
  stuffingPermissionNumber?: string; // New, from selected Manufacturer

  // Financials
  currencyType?: "INR" | "USD" | "Euro"; // From PI, editable
  conversionRate?: number; // New
  exchangeRateNotificationNumber?: string; // New
  exchangeRateDate?: Date; // New
  freightAmount?: number; // New, from PI's freight, editable
  // selectedBankId: removed
  // notifyPartyLine1: removed
  // notifyPartyLine2: removed

  termsOfDeliveryAndPayment?: string; // New, from PI's terms, editable

  containers: ExportDocumentContainerItem[];

  // Overall totals (calculated)
  totalInvoiceValue?: number;
  overallTotalNetWeight?: number;
  overallTotalGrossWeight?: number;
  overallTotalBoxes?: number;
  overallTareWeight?: number;
  overallFinalGrossWeight?: number;
}
