import type { PageMeta } from "../entities/meta.js";
import type { OnlineOrder } from "../entities/order.js";

export const GET_MY_ONLINE_ORDERS = "silpo_get_my_online_orders";

export type GetMyOnlineOrdersArgs = {
  limit?: number;
  offset?: number;
};

export type GetMyOnlineOrdersResult = {
  success: boolean;
  summary: string;
  orders: OnlineOrder[];
  meta: PageMeta;
};

/** The most rows one call may ask for, as the tool's own schema declares it. */
export const ONLINE_ORDERS_CAP = 50;
