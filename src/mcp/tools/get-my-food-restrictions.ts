import type { FoodRestriction } from "../entities/food-restriction.js";

export const GET_MY_FOOD_RESTRICTIONS = "silpo_get_my_food_restrictions";

export type GetMyFoodRestrictionsResult = {
  success: boolean;
  summary: string;
  restrictions: FoodRestriction[];
};
