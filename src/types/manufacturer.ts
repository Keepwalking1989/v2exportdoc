export interface Manufacturer {
  id: string;
  companyName: string;
  contactPerson: string;
  address: string;
  gstNumber: string;
  stuffingPermissionNumber: string;
  stuffingPermissionDate: Date;
  pinCode: string;
  isDeleted?: boolean;
}
