import type { DeliveryType } from "../entities/delivery.js";
import type { TotalMeta } from "../entities/meta.js";
import type { TimeSlot } from "../entities/time-slot.js";

export const GET_TIME_SLOTS = "silpo_get_time_slots";

export type GetTimeSlotsArgs = {
  branchId: string;
  deliveryTypes?: DeliveryType[];
  limit?: number;
  start?: string;
  end?: string;
};

export type GetTimeSlotsResult = {
  success: boolean;
  summary: string;
  slots: TimeSlot[];
  meta: TotalMeta;
};
