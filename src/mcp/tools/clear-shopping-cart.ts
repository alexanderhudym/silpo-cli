
export const CLEAR_SHOPPING_CART = "silpo_clear_shopping_cart";

export type ClearShoppingCartArgs = {
  shoppingCartId: string;
};

export type ClearShoppingCartResult = {
  success: boolean;
  summary: string;
};
