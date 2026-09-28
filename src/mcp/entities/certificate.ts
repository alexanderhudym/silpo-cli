export type Certificate = {
  id: number;
  createdAt: string;
  totalPrice: number;
  barcode: string;
  pincode: string | number | null;
  expireDate: string | null;
  title: string | null;
  image: string | null;
};
