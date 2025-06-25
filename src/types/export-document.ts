
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
}

export interface ExportDocument {
  id: string; // Unique ID for the Export Document
  exporterId: string; // ID of the selected Exporter
  purchaseOrderId?: string; // ID of the source Purchase Order, if applicable
  manufacturerId?: string; // ID of the selected Manufacturer
  transporterId?: string; // ID of the selected Transporter
  exportInvoiceNumber: string; // The user-facing invoice number
  exportInvoiceDate: Date; // The date of the export invoice
  manufacturerInvoiceNumber?: string;
  manufacturerInvoiceDate?: Date;
  permissionNumber?: string;
  countryOfFinalDestination: string; // Country of Final Destination
  vesselFlightNo?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination?: string;
  termsOfDeliveryAndPayment?: string;
  conversationRate?: number;
  exchangeNotification?: string;
  exchangeDate?: Date;
  freight?: number;
  gst?: string;
  containerItems?: ExportDocumentContainerItem[];
}
