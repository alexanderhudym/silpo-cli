import type { CartTimeslot } from "../entities/cart.js";

export const CREATE_SHOPPING_CART = "silpo_create_shopping_cart";

export type CreatableDeliveryType =
  | "SelfPickup"
  | "DeliveryHome"
  | "LongDelivery"
  | "DeliveryExpressByPromise"
  | "WideAssortDelivery"
  | "B2B"
  | "PreOrder"
  | "NovaPoshta";

export type CartAddressType =
  | "house"
  | "flat"
  | "office"
  | "point"
  | "self-pickup"
  | "nova-poshta";

export type CreateShoppingCartArgs = {
  addressType: CartAddressType;
  latitude: number;
  longitude: number;
  deliveryType: CreatableDeliveryType;
  timeslot: CartTimeslot;
  branchId: string;
  city?: string;
  street?: string;
  house?: string;
  district?: string;
};

export type CreateShoppingCartResult = {
  success: boolean;
  summary: string;
  shoppingCartId: string;
};
