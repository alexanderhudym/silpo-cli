import type { Family } from "../entities/family.js";

export const GET_MY_FAMILY = "silpo_get_my_family";

export type GetMyFamilyResult = Family & {
  success: boolean;
  summary: string;
};
