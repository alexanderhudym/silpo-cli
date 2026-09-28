import type { CategoryListItem } from "../entities/category.js";
import type { PageMeta } from "../entities/meta.js";

export const GET_CATEGORIES = "silpo_get_categories";

export type GetCategoriesArgs = {
  branchId: string;
  parentId?: string;
  limit?: number;
  offset?: number;
};

export type GetCategoriesResult = {
  success: boolean;
  summary: string;
  categories: CategoryListItem[];
  meta: PageMeta;
};
