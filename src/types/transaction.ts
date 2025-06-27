
export interface Transaction {
  id: string;
  date: Date;
  type: 'credit' | 'debit';
  partyType: 'client' | 'manufacturer' | 'transporter' | 'supplier' | 'pallet' | 'gst' | 'duty_drawback' | 'road_tp';
  partyId: string;
  currency: 'USD' | 'EUR' | 'INR';
  amount: number;
  description: string;
  isDeleted?: boolean;
}
