import type { DeliveryOption } from "../entities/delivery.js";

export const GET_AVAILABLE_DELIVERY_TYPES =
  "silpo_get_available_delivery_types";

export type GetAvailableDeliveryTypesArgs = {
  latitude: number;
  longitude: number;
};

export type GetAvailableDeliveryTypesResult = {
  success: boolean;
  summary: string;
  options: DeliveryOption[];
};
