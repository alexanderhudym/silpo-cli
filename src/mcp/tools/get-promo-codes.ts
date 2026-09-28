import type { TotalMeta } from "../entities/meta.js";
import type { PromoCode } from "../entities/promo.js";

export const GET_PROMO_CODES = "silpo_get_promo_codes";

export type GetPromoCodesResult = {
  success: boolean;
  summary: string;
  promoCodes: PromoCode[];
  meta: TotalMeta;
};
