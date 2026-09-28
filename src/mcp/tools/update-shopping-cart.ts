import type { CartAddress, CartTimeslot } from "../entities/cart.js";

export const UPDATE_SHOPPING_CART = "silpo_update_shopping_cart";

export type CartShipmentRef = {
  companyId: string;
  branchId: string;
};

export type FeedbackChanges = "approvedChanges" | "disapprovedChanges";

export type FeedbackContacts = "call" | "doNotCall";

export type UpdateShoppingCartArgs = {
  shoppingCartId: string;
  deliveryType: string;
  timeslot: CartTimeslot;
  address: CartAddress;
  shipments: CartShipmentRef[];
  branchId?: string;
  feedbackChanges?: FeedbackChanges;
  feedbackContacts?: FeedbackContacts;
  isAdultConfirmed?: boolean;
  promoCode?: string | null;
  bonusRequested?: number | null;
};

export type UpdateShoppingCartResult = {
  success: boolean;
  summary: string;
  shoppingCartId: string;
};
