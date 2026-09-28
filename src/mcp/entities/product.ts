export type SpecialPrice = {
  price: number;
  count: number;
  type: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  available: boolean;
  image: string | null;
  weighted: boolean;
  step: number;
  displayRatio: string | null;
  specialPrices: SpecialPrice[] | null;
  companyId: string | null;
  branchId: string | null;
  externalProductId: number | null;
};

export type ProductDetails = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  available: boolean;
  weighted: boolean;
  step: number;
  ratio: string | null;
  displayRatio: string | null;
  url: string;
  images: string[];
  attributes: Record<string, string | number> | null;
  companyId: string;
  branchId: string;
};

