
export interface Bank {
  id: string;
  bankName: string;
  bankAddress: string;
  accountNumber: string;
  swiftCode: string;
  ifscCode: string;
  isDeleted?: boolean;
}
