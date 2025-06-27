
export interface SupplyBillItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercentage: number;
  taxableAmount: number;
}

export interface SupplyBill {
  id: string;
  exportDocumentId: string;
  supplierId: string; // This can be an ID from either suppliers or pallets
  invoiceNumber: string;
  invoiceDate: Date;
  ackNo?: string;
  ackDate?: Date;
  items: SupplyBillItem[];
  remarks?: string;
  subTotal: number;
  discountAmount?: number;
  insuranceAmount?: number;
  freightAmount?: number;
  finalSubTotal: number;
  centralTaxRate: number;
  centralTaxAmount: number;
  stateTaxRate: number;
  stateTaxAmount: number;
  roundOff?: number;
  grandTotal: number;
  billDocumentUri?: string;
  ewayBillDocumentUri?: string;
  isDeleted?: boolean;
}
