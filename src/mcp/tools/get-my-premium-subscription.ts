import type { PremiumSubscription } from "../entities/premium.js";

export const GET_MY_PREMIUM_SUBSCRIPTION =
  "silpo_get_my_premium_subscription";

export type GetMyPremiumSubscriptionResult = PremiumSubscription & {
  success: boolean;
  summary: string;
};
