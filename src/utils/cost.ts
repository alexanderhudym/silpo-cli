const SEPARATOR = ", ";
const FROM = "from";

export type CostTier = {
  cost: number;
  fromOrderCost: number;
};

export function formatCostTiers(tiers: readonly CostTier[]): string {
  return tiers
    .map(({ cost, fromOrderCost }) => `${cost} ${FROM} ${fromOrderCost}`)
    .join(SEPARATOR);
}
