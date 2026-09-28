import type { NpSettlement } from "../entities/nova-poshta.js";

export const FIND_NOVA_POSHTA_SETTLEMENTS =
  "silpo_find_nova_poshta_settlements";

export type FindNovaPoshtaSettlementsArgs = {
  title: string;
};

export type FindNovaPoshtaSettlementsResult = {
  success: boolean;
  summary: string;
  settlements: NpSettlement[];
};
