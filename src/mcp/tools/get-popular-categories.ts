import type { PopularCategory } from "../entities/category.js";
import type { DeliveryType } from "../entities/delivery.js";

export const GET_POPULAR_CATEGORIES = "silpo_get_popular_categories";

export type GetPopularCategoriesArgs = {
  branchId: string;
  deliveryType: DeliveryType;
};

export type GetPopularCategoriesResult = {
  success: boolean;
  summary: string;
  categories: PopularCategory[];
};
