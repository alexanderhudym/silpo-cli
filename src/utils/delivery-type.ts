import type { DeliveryType } from "../mcp/entities/delivery.js";

export const DELIVERY_TYPES: readonly DeliveryType[] = [
  "Unknown",
  "SelfPickup",
  "DeliveryHome",
  "DeliveryFlat",
  "DeliveryOffice",
  "DeliveryGlovo",
  "DeliveryExpress",
  "DeliveryExpressFood",
  "JustIn",
  "LongDelivery",
  "JustInPost",
  "NovaPoshta",
  "DeliveryExpressByPromise",
  "WideAssortDelivery",
  "B2B",
  "PreOrder",
];

export function toDeliveryType(raw: string): DeliveryType | null {
  return (DELIVERY_TYPES as readonly string[]).includes(raw) ? (raw as DeliveryType) : null;
}

export function requireDeliveryType(raw: string): DeliveryType {
  const value = toDeliveryType(raw);

  if (value === null) throw new Error(`expected one of ${DELIVERY_TYPES.join(", ")}`);

  return value;
}
