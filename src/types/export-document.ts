
export interface ExportDocument {
  id: string; // Unique ID for the Export Document
  exporterId: string; // ID of the selected Exporter
  purchaseOrderId?: string; // ID of the source Purchase Order, if applicable
  manufacturerId?: string; // ID of the selected Manufacturer
  exportInvoiceNumber: string; // The user-facing invoice number
  exportInvoiceDate: Date; // The date of the export invoice
}
