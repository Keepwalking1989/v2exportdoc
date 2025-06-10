
export interface ExportDocumentProductItem {
  id: string; // Unique ID for the product line item within a container
  sizeId: string;
  productId: string;
  boxes: number;
  ratePerSqmt: number; // Editable, pre-filled from Size master data's salesPrice
  // Calculated fields (will be displayed, not directly part of form submission if always derived on display/save)
  quantitySqmt?: number;
  amount?: number;
  netWtKgs?: number; // Calculated: boxes * size.boxWeight
  grossWtKgs?: number; // Editable, defaults to netWtKgs
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
  description?: string; // General description of goods in this container
  weighingDateTime?: Date | string; // Allow string for initial input, convert to Date
  weighingSlipNo?: string;
  truckNumber?: string;
  biltiNo?: string;
  products: ExportDocumentProductItem[];
}

export interface ExportDocument {
  id: string; // Unique ID for the export document
  purchaseOrderId?: string; // Reference to the source Purchase Order, if selected
  performaInvoiceId?: string; // Reference to the source Performa Invoice (if available via PO)
  
  exportInvoiceNumber: string; // Editable
  exportInvoiceDate: Date;
  
  exporterId?: string; // From PO
  clientId?: string; // From PI (via PO)
  manufacturerId?: string; // From PO (to get Manufacturer's GST)

  vesselFlightNo?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination?: string; // From PI
  countryOfOrigin?: string; 
  countryOfFinalDestination?: string; // From PI

  shippingMarks?: string;
  manufacturerGST?: string; // Fetched from Manufacturer (via PO), display only

  currencyType?: "INR" | "USD" | "Euro"; // From PI
  selectedBankId?: string; // From PI's bank

  notifyPartyLine1?: string; // From PI
  notifyPartyLine2?: string; // From PI

  containers: ExportDocumentContainerItem[];
  
  // Overall totals (calculated on save/display)
  totalInvoiceValue?: number;
  overallTotalGrossWeight?: number;
  overallTotalBoxes?: number;
}
