

export interface ExportDocumentProductItem {
  id: string;
  productId: string;
  boxes: number;
  rate?: number;
  netWeight?: number;
  grossWeight?: number;
}

export interface ExportDocumentContainerItem {
  id: string; // Unique ID for this container item
  bookingNo?: string;
  containerNo?: string;
  lineSeal?: string;
  rfidSeal?: string;
  truckNumber?: string;
  builtyNo?: string;
  tareWeight?: number;
  startPalletNo?: string;
  endPalletNo?: string;
  totalPallets?: string;
  description?: string;
  weighingSlipNo?: string;
  weighingDateTime?: Date;
  productItems?: ExportDocumentProductItem[];
  sampleItems?: ExportDocumentProductItem[];
}

export interface ManufacturerInfo {
  id: string; // React key for useFieldArray
  manufacturerId: string;
  invoiceNumber: string;
  invoiceDate?: Date;
  permissionNumber?: string;
}

export interface ExportDocument {
  id:string; // Unique ID for the Export Document
  exporterId: string; // ID of the selected Exporter
  clientId: string; // ID of the selected Client
  performaInvoiceId?: string;
  purchaseOrderId?: string; // ID of the source Purchase Order, if applicable
  transporterId: string; // ID of the selected Transporter
  exportInvoiceNumber: string; // The user-facing invoice number
  exportInvoiceDate: Date; // The date of the export invoice
  
  manufacturerDetails: ManufacturerInfo[];
  manufacturerId?: string; // legacy support

  countryOfOrigin?: string; // New field
  countryOfFinalDestination: string; // Country of Final Destination
  vesselFlightNo?: string;
  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  termsOfDeliveryAndPayment: string;
  conversationRate: number;
  exchangeNotification: string;
  exchangeDate: Date;
  freight: number;
  gst: string;
  discount?: number;
  containerItems?: ExportDocumentContainerItem[];
  totalInvoiceValue?: number; // New field

  // New fields for Eway Bill
  ewayBillNumber?: string;
  ewayBillDate?: Date;
  ewayBillDocument?: string; // Storing file as data URI

  // New fields for Shipping Bill
  shippingBillNumber?: string;
  shippingBillDate?: Date;
  shippingBillDocument?: string; // data URI

  // New fields for BL
  blNumber?: string;
  blDate?: Date;
  blDocument?: string; // data URI

  // New field for BRC
  brcDocument?: string; // data URI

  // QC and Sample Photos
  qcPhotos?: string[];
  samplePhotos?: string[];

  isDeleted?: boolean;
}
