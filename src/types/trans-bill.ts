
export interface TransBillItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  gstRate: number; // The GST rate percentage (e.g., 18)
  amount: number; // Calculated as quantity * rate
}

export interface TransBill {
  id: string;
  exportDocumentId: string;
  transporterId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  jobNo?: string;
  jobDate?: Date;
  shippingLine?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  shipmentType?: string;
  containerNo?: string;
  shippingBillNo?: string;
  items: TransBillItem[];
  remarks?: string;
  subTotal: number; // Sum of item amounts
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalTax: number;
  totalAfterTax: number;
  roundOff?: number;
  totalPayable: number;
  billDocumentUri?: string; // Data URI for the uploaded bill
  lrDocumentUri?: string; // Data URI for the uploaded Lorry Receipt
  isDeleted?: boolean;
}
