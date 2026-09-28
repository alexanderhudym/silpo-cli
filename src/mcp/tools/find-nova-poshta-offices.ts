import type { TotalMeta } from "../entities/meta.js";
import type { NpOffice } from "../entities/nova-poshta.js";

export const FIND_NOVA_POSHTA_OFFICES = "silpo_find_nova_poshta_offices";

export type FindNovaPoshtaOfficesArgs = {
  settlementId: string;
  title?: string;
};

export type FindNovaPoshtaOfficesResult = {
  success: boolean;
  summary: string;
  offices: NpOffice[];
  meta: TotalMeta;
};
