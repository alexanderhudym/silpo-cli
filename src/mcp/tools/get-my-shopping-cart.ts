
export const GET_MY_SHOPPING_CART = "silpo_get_my_shopping_cart";

export type GetMyShoppingCartResult = {
  success: boolean;
  shoppingCartId: string | null;
  exists: boolean;
};
