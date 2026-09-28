import type { PageMeta } from "../entities/meta.js";
import type { OfflineOrder } from "../entities/order.js";

export const GET_MY_OFFLINE_ORDERS = "silpo_get_my_offline_orders";

export type GetMyOfflineOrdersArgs = {
  branchId: string;
  deliveryType: string;
  timeslotStart: string;
  timeslotEnd: string;
  limit?: number;
  offset?: number;
  dateStart?: string;
  dateEnd?: string;
};

export type GetMyOfflineOrdersResult = {
  success: boolean;
  summary: string;
  orders: OfflineOrder[];
  meta: PageMeta;
};

/** The most rows one call may ask for, as the tool's own schema declares it. */
export const OFFLINE_ORDERS_CAP = 10;
