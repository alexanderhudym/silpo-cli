import type { DeliveryType } from "../entities/delivery.js";
import type { PageMeta } from "../entities/meta.js";
import type { Product } from "../entities/product.js";

export const GET_PRODUCTS = "silpo_get_products";

export type ProductSortBy =
  | "popularity"
  | "score"
  | "title"
  | "price"
  | "promotion"
  | "productsList"
  | "slugsList"
  | "guestRating"
  | "carouselList";

export type SortDirection = "asc" | "desc";

export type GetProductsArgs = {
  branchId: string;
  deliveryType: DeliveryType;
  timeslotStart: string;
  timeslotEnd: string;
  mustHavePromotion?: boolean;
  category?: string;
  promotionCode?: string;
  inStock?: boolean;
  set?: string;
  limit?: number;
  offset?: number;
  sortBy?: ProductSortBy;
  sortDirection?: SortDirection;
  fromPrice?: number;
  toPrice?: number;
};

export type GetProductsResult = {
  success: boolean;
  summary: string;
  products: Product[];
  meta: PageMeta;
};
