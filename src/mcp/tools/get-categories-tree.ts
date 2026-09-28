import type { CategoryTreeNode } from "../entities/category.js";
import type { DeliveryType } from "../entities/delivery.js";

export const GET_CATEGORIES_TREE = "silpo_get_categories_tree";

export type GetCategoriesTreeArgs = {
  branchId: string;
  deliveryType: DeliveryType;
  timeslotStart: string;
  timeslotEnd: string;
};

export type GetCategoriesTreeResult = {
  success: boolean;
  summary: string;
  tree: CategoryTreeNode[];
};
