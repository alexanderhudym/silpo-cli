import type { FoundAddress } from "../entities/address.js";

export const FIND_ADDRESS = "silpo_find_address";

export type FindAddressArgs = {
  address: string;
};

export type FindAddressResult = {
  success: boolean;
  summary: string;
  addresses: FoundAddress[];
};
