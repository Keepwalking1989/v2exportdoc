
export interface Product {
  id: string; // Unique ID for the product entry
  sizeId: string; // ID of the selected size
  designName: string;
  salesPrice?: number;
  boxWeight?: number;
  imageUrl?: string;
  isDeleted?: boolean;
}
