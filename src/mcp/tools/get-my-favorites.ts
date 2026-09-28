import type { DeliveryType } from "../entities/delivery.js";
import type { PageMeta } from "../entities/meta.js";
import type { Product } from "../entities/product.js";

export const GET_MY_FAVORITES = "silpo_get_my_favorites";

export type GetMyFavoritesArgs = {
  branchId: string;
  deliveryType: DeliveryType;
  timeslotStart: string;
  limit?: number;
  offset?: number;
};

export type GetMyFavoritesResult = {
  success: boolean;
  summary: string;
  products: Product[];
  meta: PageMeta;
};
