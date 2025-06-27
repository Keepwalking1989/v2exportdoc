
export interface Transaction {
  id: string;
  date: Date;
  type: 'credit' | 'debit';
  partyType: 'client' | 'manufacturer' | 'transporter' | 'supplier' | 'pallet';
  partyId: string;
  currency: 'USD' | 'EUR' | 'INR';
  amount: number;
  description: string;
  isDeleted?: boolean;
}
