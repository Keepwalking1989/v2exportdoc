export interface ExportDocument {
  id: string; // Unique ID for the Export Document
  exporterId: string; // ID of the selected Exporter
  purchaseOrderId?: string; // ID of the source Purchase Order, if applicable
}