export type DeliveryType =
  | "Unknown"
  | "SelfPickup"
  | "DeliveryHome"
  | "DeliveryFlat"
  | "DeliveryOffice"
  | "DeliveryGlovo"
  | "DeliveryExpress"
  | "DeliveryExpressFood"
  | "JustIn"
  | "LongDelivery"
  | "JustInPost"
  | "NovaPoshta"
  | "DeliveryExpressByPromise"
  | "WideAssortDelivery"
  | "B2B"
  | "PreOrder";

export type DeliveryOption = {
  deliveryType: string;
  branchId: string | null;
  description: string;
};
