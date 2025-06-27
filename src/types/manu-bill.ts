
export interface ManuBillItem {
  id: string;
  description: string;
  grade: string;
  hsnCode: string;
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
  transporterId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  ewayBillNumber?: string;
  ackNo?: string;
  ackDate?: Date;
  irnNo?: string;
  lrNo?: string;
  lrDate?: Date;
  vehicleNo?: string;
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
