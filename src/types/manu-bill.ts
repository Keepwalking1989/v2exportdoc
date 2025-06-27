
export interface ManuBillItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercentage: number;
  taxableAmount: number;
}

export interface ManuBill {
  id: string;
  exportDocumentId: string;
  manufacturerId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  ackNo?: string;
  ackDate?: Date;
  items: ManuBillItem[];
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
