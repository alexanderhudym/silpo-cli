import type { Cart, CartLoyalty } from "../entities/cart.js";

export const GET_SHOPPING_CART_BY_ID = "silpo_get_shopping_cart_by_id";

export type GetShoppingCartByIdArgs = {
  shoppingCartId: string;
};

export type GetShoppingCartByIdResult = {
  success: boolean;
  cart: Cart;
  loyalty: CartLoyalty | null;
  checkoutWebLink?: string;
  checkoutMobileLink?: string;
};
