import type { SavedAddress } from "../entities/address.js";

export const GET_MY_DELIVERY_ADDRESSES = "silpo_get_my_delivery_addresses";

export type GetMyDeliveryAddressesResult = {
  success: boolean;
  summary: string;
  addresses: SavedAddress[];
};
