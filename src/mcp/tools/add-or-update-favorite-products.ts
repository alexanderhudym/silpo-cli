
export const ADD_OR_UPDATE_FAVORITE_PRODUCTS =
  "silpo_add_or_update_favorite_products";

export type FavoriteAction = {
  productId: string;
  externalProductId: number;
  toDelete: boolean;
};

export type AddOrUpdateFavoriteProductsArgs = {
  actions: FavoriteAction[];
};

export type FavoriteActionOutcome = {
  productId: string;
  toDelete: boolean;
};

export type AddOrUpdateFavoriteProductsResult = {
  success: boolean;
  summary: string;
  actions: FavoriteActionOutcome[];
};
