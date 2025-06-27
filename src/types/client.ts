
export interface Client {
  id: string;
  companyName: string;
  person: string;
  contactNumber: string;
  address: string;
  city: string;
  country: string;
  pinCode: string;
  isDeleted?: boolean;
}
