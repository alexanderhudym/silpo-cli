
export const ADD_OR_UPDATE_CART_PRODUCTS = "silpo_add_or_update_cart_products";

export type CartProductInput = {
  productId: string;
  companyId: string;
  branchId: string;
  quantity: number;
  addQuantity?: boolean;
  comment?: string;
};

export type AddOrUpdateCartProductsArgs = {
  shoppingCartId: string;
  products: CartProductInput[];
};

export type CartProductOutcome = {
  productId: string;
  quantity: number;
};

export type AddOrUpdateCartProductsResult = {
  success: boolean;
  summary: string;
  products: CartProductOutcome[];
};
