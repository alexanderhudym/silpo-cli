import type { TotalMeta } from "../entities/meta.js";
import type { Product } from "../entities/product.js";

export const GET_SIMILAR_PRODUCTS = "silpo_get_similar_products";

export type GetSimilarProductsArgs = {
  branchId: string;
  slug: string;
  deliveryType: string;
  timeslotStart: string;
  timeslotEnd: string;
  limit?: number;
  offset?: number;
};

export type GetSimilarProductsResult = {
  success: boolean;
  summary: string;
  products: Product[];
  meta: TotalMeta;
};
