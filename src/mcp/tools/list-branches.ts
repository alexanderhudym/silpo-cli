import type { Branch } from "../entities/branch.js";
import type { PageMeta } from "../entities/meta.js";

export const LIST_BRANCHES = "silpo_list_branches";

export type ListBranchesArgs = {
  limit?: number;
  offset?: number;
  hasPickup?: boolean;
  hasNP?: boolean;
};

export type ListBranchesResult = {
  success: boolean;
  summary: string;
  branches: Branch[];
  meta: PageMeta;
};
