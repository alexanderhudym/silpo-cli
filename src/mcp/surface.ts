import * as tools from "./silpo.js";

export type ToolResponse<Payload extends Record<string, unknown>> = {
  content: string;
  structured: Payload;
};

export type ToolSpecs = {
  addOrUpdateCartProducts: {
    args: tools.AddOrUpdateCartProductsArgs;
    result: tools.AddOrUpdateCartProductsResult;
  };
  addOrUpdateCertificates: {
    args: tools.AddOrUpdateCertificatesArgs;
    result: tools.AddOrUpdateCertificatesResult;
  };
  addOrUpdateFavoriteProducts: {
    args: tools.AddOrUpdateFavoriteProductsArgs;
    result: tools.AddOrUpdateFavoriteProductsResult;
  };
  clearShoppingCart: {
    args: tools.ClearShoppingCartArgs;
    result: tools.ClearShoppingCartResult;
  };
  createShoppingCart: {
    args: tools.CreateShoppingCartArgs;
    result: tools.CreateShoppingCartResult;
  };
  findAddress: { args: tools.FindAddressArgs; result: tools.FindAddressResult };
  findNovaPoshtaOffices: {
    args: tools.FindNovaPoshtaOfficesArgs;
    result: tools.FindNovaPoshtaOfficesResult;
  };
  findNovaPoshtaSettlements: {
    args: tools.FindNovaPoshtaSettlementsArgs;
    result: tools.FindNovaPoshtaSettlementsResult;
  };
  findProductsBatch: {
    args: tools.FindProductsBatchArgs;
    result: tools.FindProductsBatchResult;
  };
  getAvailableDeliveryTypes: {
    args: tools.GetAvailableDeliveryTypesArgs;
    result: tools.GetAvailableDeliveryTypesResult;
  };
  getCategories: {
    args: tools.GetCategoriesArgs;
    result: tools.GetCategoriesResult;
  };
  getCategoriesTree: {
    args: tools.GetCategoriesTreeArgs;
    result: tools.GetCategoriesTreeResult;
  };
  getCategory: { args: tools.GetCategoryArgs; result: tools.GetCategoryResult };
  getCouponDetails: {
    args: tools.GetCouponDetailsArgs;
    result: tools.GetCouponDetailsResult;
  };
  getLoyaltyInfo: { args: void; result: tools.GetLoyaltyInfoResult };
  getMyCertificates: {
    args: tools.GetMyCertificatesArgs;
    result: tools.GetMyCertificatesResult;
  };
  getMyCoupons: { args: void; result: tools.GetMyCouponsResult };
  getMyDeliveryAddresses: {
    args: void;
    result: tools.GetMyDeliveryAddressesResult;
  };
  getMyFamily: { args: void; result: tools.GetMyFamilyResult };
  getMyFavorites: {
    args: tools.GetMyFavoritesArgs;
    result: tools.GetMyFavoritesResult;
  };
  getMyFoodRestrictions: {
    args: void;
    result: tools.GetMyFoodRestrictionsResult;
  };
  getMyOfflineOrders: {
    args: tools.GetMyOfflineOrdersArgs;
    result: tools.GetMyOfflineOrdersResult;
  };
  getMyOnlineOrders: {
    args: tools.GetMyOnlineOrdersArgs;
    result: tools.GetMyOnlineOrdersResult;
  };
  getMyPremiumSubscription: {
    args: void;
    result: tools.GetMyPremiumSubscriptionResult;
  };
  getMyProfile: { args: void; result: tools.GetMyProfileResult };
  getMyPromos: { args: void; result: tools.GetMyPromosResult };
  getMyShoppingCart: { args: void; result: tools.GetMyShoppingCartResult };
  getPopularCategories: {
    args: tools.GetPopularCategoriesArgs;
    result: tools.GetPopularCategoriesResult;
  };
  getProductDetails: {
    args: tools.GetProductDetailsArgs;
    result: tools.GetProductDetailsResult;
  };
  getProductSets: {
    args: tools.GetProductSetsArgs;
    result: tools.GetProductSetsResult;
  };
  getProducts: { args: tools.GetProductsArgs; result: tools.GetProductsResult };
  getPromoCodes: { args: void; result: tools.GetPromoCodesResult };
  getPromotions: {
    args: tools.GetPromotionsArgs;
    result: tools.GetPromotionsResult;
  };
  getShoppingCartById: {
    args: tools.GetShoppingCartByIdArgs;
    result: tools.GetShoppingCartByIdResult;
  };
  getSimilarProducts: {
    args: tools.GetSimilarProductsArgs;
    result: tools.GetSimilarProductsResult;
  };
  getTimeSlots: {
    args: tools.GetTimeSlotsArgs;
    result: tools.GetTimeSlotsResult;
  };
  listBranches: {
    args: tools.ListBranchesArgs;
    result: tools.ListBranchesResult;
  };
  removeCartProducts: {
    args: tools.RemoveCartProductsArgs;
    result: tools.RemoveCartProductsResult;
  };
  updateShoppingCart: {
    args: tools.UpdateShoppingCartArgs;
    result: tools.UpdateShoppingCartResult;
  };
};

export const TOOLS = {
  addOrUpdateCartProducts: tools.ADD_OR_UPDATE_CART_PRODUCTS,
  addOrUpdateCertificates: tools.ADD_OR_UPDATE_CERTIFICATES,
  addOrUpdateFavoriteProducts: tools.ADD_OR_UPDATE_FAVORITE_PRODUCTS,
  clearShoppingCart: tools.CLEAR_SHOPPING_CART,
  createShoppingCart: tools.CREATE_SHOPPING_CART,
  findAddress: tools.FIND_ADDRESS,
  findNovaPoshtaOffices: tools.FIND_NOVA_POSHTA_OFFICES,
  findNovaPoshtaSettlements: tools.FIND_NOVA_POSHTA_SETTLEMENTS,
  findProductsBatch: tools.FIND_PRODUCTS_BATCH,
  getAvailableDeliveryTypes: tools.GET_AVAILABLE_DELIVERY_TYPES,
  getCategories: tools.GET_CATEGORIES,
  getCategoriesTree: tools.GET_CATEGORIES_TREE,
  getCategory: tools.GET_CATEGORY,
  getCouponDetails: tools.GET_COUPON_DETAILS,
  getLoyaltyInfo: tools.GET_LOYALTY_INFO,
  getMyCertificates: tools.GET_MY_CERTIFICATES,
  getMyCoupons: tools.GET_MY_COUPONS,
  getMyDeliveryAddresses: tools.GET_MY_DELIVERY_ADDRESSES,
  getMyFamily: tools.GET_MY_FAMILY,
  getMyFavorites: tools.GET_MY_FAVORITES,
  getMyFoodRestrictions: tools.GET_MY_FOOD_RESTRICTIONS,
  getMyOfflineOrders: tools.GET_MY_OFFLINE_ORDERS,
  getMyOnlineOrders: tools.GET_MY_ONLINE_ORDERS,
  getMyPremiumSubscription: tools.GET_MY_PREMIUM_SUBSCRIPTION,
  getMyProfile: tools.GET_MY_PROFILE,
  getMyPromos: tools.GET_MY_PROMOS,
  getMyShoppingCart: tools.GET_MY_SHOPPING_CART,
  getPopularCategories: tools.GET_POPULAR_CATEGORIES,
  getProductDetails: tools.GET_PRODUCT_DETAILS,
  getProductSets: tools.GET_PRODUCT_SETS,
  getProducts: tools.GET_PRODUCTS,
  getPromoCodes: tools.GET_PROMO_CODES,
  getPromotions: tools.GET_PROMOTIONS,
  getShoppingCartById: tools.GET_SHOPPING_CART_BY_ID,
  getSimilarProducts: tools.GET_SIMILAR_PRODUCTS,
  getTimeSlots: tools.GET_TIME_SLOTS,
  listBranches: tools.LIST_BRANCHES,
  removeCartProducts: tools.REMOVE_CART_PRODUCTS,
  updateShoppingCart: tools.UPDATE_SHOPPING_CART,
} satisfies Record<keyof ToolSpecs, string>;

export type MethodName = keyof ToolSpecs;

type ToolCall<
  Spec extends { args: unknown; result: Record<string, unknown> },
> = [Spec["args"]] extends [void]
  ? () => Promise<ToolResponse<Spec["result"]>>
  : object extends Spec["args"]
    ? (args?: Spec["args"]) => Promise<ToolResponse<Spec["result"]>>
    : (args: Spec["args"]) => Promise<ToolResponse<Spec["result"]>>;

export type SilpoSurface = {
  [Method in MethodName]: ToolCall<ToolSpecs[Method]>;
};

export type ToolCaller = (
  tool: string,
  args: Record<string, unknown>,
) => Promise<ToolResponse<Record<string, unknown>>>;

export function createSurface(caller: ToolCaller): SilpoSurface {
  const entries = Object.entries(TOOLS).map(([method, tool]) => [
    method,
    (args: Record<string, unknown> = {}) => caller(tool, args),
  ]);

  return Object.fromEntries(entries) as SilpoSurface;
}
