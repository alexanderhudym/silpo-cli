import type { Coupon } from "../entities/coupon.js";

export const GET_MY_COUPONS = "silpo_get_my_coupons";

export type GetMyCouponsResult = {
  success: boolean;
  summary: string;
  coupons: Coupon[];
};
