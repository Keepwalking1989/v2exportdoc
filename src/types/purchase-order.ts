

export interface PurchaseOrderItem {
  id?: string; // Optional because a new item doesn't have an ID yet
  productId: string; // ID of the product (from the source PI's items, filtered by PO's selected size)
  designImage: string; // Text field, "AS PER SAMPLE" or future image reference
  weightPerBox: number; // Auto-filled from Size data based on selected product, editable
  boxes: number; // Can be pre-filled from source PI item if product matches, editable
  thickness: string; // Pre-filled "8.5 MM to 9.0 MM", editable
}

export interface PurchaseOrder {
  id: string; // Unique ID for the Purchase Order
  sourcePiId: string; // ID of the Performa Invoice this PO was generated from
  exporterId: string; // Selected from dropdown (pre-filled from PI's exporterId)
  manufacturerId: string; // Selected from dropdown
  poNumber: string; // Auto-generated (e.g., HEM/PO/25-26/001), editable
  poDate: Date; // From date picker, defaults to current date
  sizeId: string; // Selected from dropdown (distinct sizes from the source PI's items)
  numberOfContainers: number; // User input
  items: PurchaseOrderItem[]; // Array of product items for this PO
  termsAndConditions: string; // New field for terms and conditions
  isDeleted?: boolean;
}
