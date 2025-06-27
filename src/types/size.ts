
export interface Size {
  id: string;
  size: string;
  sqmPerBox: number;
  boxWeight: number;
  purchasePrice: number;
  salesPrice: number;
  hsnCode: string;
  palletDetails: string;
  isDeleted?: boolean;
}
