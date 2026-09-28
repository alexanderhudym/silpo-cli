import type { CouponDetails } from "../entities/coupon.js";

export const GET_COUPON_DETAILS = "silpo_get_coupon_details";

export type GetCouponDetailsArgs = {
  businessCouponId: number;
};

export type GetCouponDetailsResult = {
  success: boolean;
  coupon: CouponDetails;
};
