import type { Promo } from "../entities/promo.js";

export const GET_MY_PROMOS = "silpo_get_my_promos";

export type PromoSelectionMeta = {
  total: number;
  minSelect: number;
  maxSelect: number;
};

export type GetMyPromosResult = {
  success: boolean;
  summary: string;
  promos: Promo[];
  meta: PromoSelectionMeta;
};
