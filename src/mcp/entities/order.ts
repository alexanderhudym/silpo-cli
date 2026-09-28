export type OrderTimeSlot = {
  from: string | null;
  to: string | null;
};

export type OrderDelivery = {
  type: string;
  timeSlot: OrderTimeSlot | null;
  deliveredAt: string | null;
};

export type OrderAddress = {
  city: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
};

export type OrderProduct = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  removed: boolean;
  image: string | null;
  companyId: string;
  branchId: string;
};

export type OnlineOrder = {
  orderId: string;
  number: string | null;
  status: string;
  createdAt: string;
  amount: number;
  discount: number;
  delivery: OrderDelivery | null;
  address: OrderAddress | null;
  products: OrderProduct[];
};

export type OfflineOrderReward = {
  rewardGroupCodeName: string;
  applyText: string | null;
  valueText: string;
  applyRewardAmount: number;
  promoId: number | null;
};

export type OfflineCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  available: boolean;
  image: string | null;
  weighted: boolean;
  step: number;
  companyId: string;
  branchId: string;
};

export type OfflineOrderProduct = {
  lagerId: number;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  image: string | null;
  catalogProduct: OfflineCatalogProduct | null;
};

export type OfflineOrder = {
  filId: number;
  filialName: string;
  cityName: string;
  createdAt: string;
  sumReg: number;
  accruedBalaBonusesSum: number;
  sumDiscount: number;
  receiptUrl: string | null;
  chequeMagicName: string | null;
  chequePrediction: string | null;
  rewards: OfflineOrderReward[];
  products: OfflineOrderProduct[];
};
