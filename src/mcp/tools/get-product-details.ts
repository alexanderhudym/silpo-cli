import type { ProductDetails } from "../entities/product.js";

export const GET_PRODUCT_DETAILS = "silpo_get_product_details";

export type GetProductDetailsArgs = {
  branchId: string;
  slug: string;
  deliveryType: string;
  timeslotStart: string;
  timeslotEnd: string;
};

export type GetProductDetailsResult = {
  success: boolean;
  product: ProductDetails;
};
