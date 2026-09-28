import type { DeliveryType } from "../entities/delivery.js";
import type { Promotion } from "../entities/promotion.js";

export const GET_PROMOTIONS = "silpo_get_promotions";

export type GetPromotionsArgs = {
  branchId: string;
  deliveryType: DeliveryType;
  timeslotStart: string;
  timeslotEnd: string;
};

export type GetPromotionsResult = {
  success: boolean;
  summary: string;
  promotions: Promotion[];
};
