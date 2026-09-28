import type { CategoryDetails } from "../entities/category.js";
import type { DeliveryType } from "../entities/delivery.js";

export const GET_CATEGORY = "silpo_get_category";

export type GetCategoryArgs = {
  branchId: string;
  deliveryType: DeliveryType;
  categorySlug: string;
};

export type GetCategoryResult = {
  success: boolean;
  category: CategoryDetails;
};
