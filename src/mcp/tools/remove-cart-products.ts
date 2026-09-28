
export const REMOVE_CART_PRODUCTS = "silpo_remove_cart_products";

export type CartProductRef = {
  productId: string;
};

export type RemoveCartProductsArgs = {
  shoppingCartId: string;
  products: CartProductRef[];
};

export type RemoveCartProductsResult = {
  success: boolean;
  summary: string;
  products: CartProductRef[];
};
