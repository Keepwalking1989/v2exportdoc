
export interface Transaction {
  id: string;
  date: Date;
  type: 'credit' | 'debit';
  partyType: 'client' | 'manufacturer' | 'transporter' | 'supplier' | 'pallet' | 'gst' | 'duty_drawback' | 'road_tp';
  partyId: string;
  exportDocumentId?: string; 
  relatedInvoices?: {
    type: 'manu' | 'trans' | 'supply';
    id: string;
  }[];
  // New fields to link automatic transactions to source bills
  sourceBillId?: string;
  sourceBillType?: 'manu' | 'trans' | 'supply';
  currency: 'USD' | 'EUR' | 'INR';
  amount: number;
  description?: string;
  isDeleted?: boolean;
}
