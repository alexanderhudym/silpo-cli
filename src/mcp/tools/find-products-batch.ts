import type { DeliveryType } from "../entities/delivery.js";
import type { Product } from "../entities/product.js";

export const FIND_PRODUCTS_BATCH = "silpo_find_products_batch";

export type FindProductsBatchArgs = {
  branchId: string;
  deliveryType: DeliveryType;
  timeslotStart: string;
  timeslotEnd: string;
  products: string[];
  limit?: number;
};

export type ProductQuery = {
  query: string;
  totalFound: number;
  products: Product[];
};

export type BatchMeta = {
  totalQueries: number;
  totalProducts: number;
};

export type FindProductsBatchResult = {
  success: boolean;
  summary: string;
  queries: ProductQuery[];
  meta: BatchMeta;
};
