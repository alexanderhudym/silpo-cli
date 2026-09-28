import type { Loyalty } from "../entities/loyalty.js";

export const GET_LOYALTY_INFO = "silpo_get_loyalty_info";

export type GetLoyaltyInfoResult = {
  success: boolean;
  loyalty: Loyalty;
};
