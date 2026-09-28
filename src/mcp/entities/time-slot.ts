export type DeliveryCostTier = {
  cost: number;
  fromOrderCost: number;
};

export type TimeSlotConstraints = {
  isLimitedAlcohol: boolean;
  isLimitedTobacco: boolean;
  isLimitedCookedFood: boolean;
  isLimitedOwnCooking: boolean;
};

export type FastDelivery = {
  cost: number;
  time: number;
};

export type TimeSlot = {
  start: string;
  end: string;
  available: boolean;
  deliveryType: string;
  deliveryCost: number | null;
  deliveryCostMap: DeliveryCostTier[];
  minOrderCost: number;
  maxWeight: number | null;
  constraints: TimeSlotConstraints;
  fast: FastDelivery | null;
};
