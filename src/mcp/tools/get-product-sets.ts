import type { ProductSet } from "../entities/product-set.js";

export const GET_PRODUCT_SETS = "silpo_get_product_sets";

export type GetProductSetsArgs = {
  branchId: string;
  deliveryType?: string;
};

export type GetProductSetsResult = {
  success: boolean;
  summary: string;
  sets: ProductSet[];
};
