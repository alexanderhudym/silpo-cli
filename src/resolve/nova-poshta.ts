import type { NpOffice, NpSettlement } from "../mcp/entities/nova-poshta.js";
import type { SilpoSurface } from "../mcp/surface.js";
import { formatCoordinate } from "../utils/coordinate.js";
import { formatList, formatRows } from "../utils/list.js";
import { formatEntryAsRow } from "../utils/record.js";
import { exactlyOneMatching, toOneLine } from "../utils/text.js";

const WORKING = "Working";

export type NovaPoshtaClient = Pick<SilpoSurface, "findNovaPoshtaSettlements" | "findNovaPoshtaOffices">;

export type NovaPoshtaResolution =
  | { readonly outcome: "resolved"; readonly settlement: NpSettlement; readonly office: NpOffice }
  | { readonly outcome: "ambiguous-settlement"; readonly candidates: readonly NpSettlement[] }
  | {
      readonly outcome: "ambiguous-office";
      readonly settlement: NpSettlement;
      readonly candidates: readonly NpOffice[];
    }
  | { readonly outcome: "no-settlement" }
  | { readonly outcome: "no-office"; readonly settlement: NpSettlement };

function settlementTitle({ title }: NpSettlement): string {
  return title;
}

function officeTitle({ title }: NpOffice): string {
  return toOneLine(title);
}

export async function resolveNovaPoshta(
  client: NovaPoshtaClient,
  settlement: string,
  office?: string,
): Promise<NovaPoshtaResolution> {
  const { structured: settlements } = await client.findNovaPoshtaSettlements({ title: settlement });
  const settlementCandidates = settlements.settlements;

  if (settlementCandidates.length === 0) return { outcome: "no-settlement" };

  const found =
    settlementCandidates.length === 1
      ? settlementCandidates[0]!
      : exactlyOneMatching(settlement, settlementCandidates, settlementTitle);

  if (found === null) return { outcome: "ambiguous-settlement", candidates: settlementCandidates };

  const { structured: offices } = await client.findNovaPoshtaOffices({
    settlementId: found.id,
    title: office,
  });
  const officeCandidates = offices.offices;

  if (officeCandidates.length === 0) return { outcome: "no-office", settlement: found };

  if (officeCandidates.length === 1) {
    return { outcome: "resolved", settlement: found, office: officeCandidates[0]! };
  }

  const exactOffice =
    office === undefined ? null : exactlyOneMatching(office, officeCandidates, officeTitle);

  if (exactOffice !== null) return { outcome: "resolved", settlement: found, office: exactOffice };

  return { outcome: "ambiguous-office", settlement: found, candidates: officeCandidates };
}

function settlementCandidateText({ id, title, area, region }: NpSettlement): string {
  return formatRows([
    formatEntryAsRow("id", id),
    formatEntryAsRow("title", title),
    area && formatEntryAsRow("area", area),
    region && formatEntryAsRow("region", region),
  ]);
}

function officeCandidateText(office: NpOffice): string {
  const { id, status, latitude, longitude } = office;

  return formatRows([
    formatEntryAsRow("id", id),
    formatEntryAsRow("coordinates", `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`),
    status !== WORKING && formatEntryAsRow("status", status),
    officeTitle(office),
  ]);
}

export function settlementCandidatesText(candidates: readonly NpSettlement[]): string {
  const items = candidates.map(settlementCandidateText);

  return `${formatList([`Found ${candidates.length} matching settlements`, formatList(items)])}\n`;
}

export function officeCandidatesText(candidates: readonly NpOffice[]): string {
  const items = candidates.map(officeCandidateText);

  return `${formatList([`Found ${candidates.length} matching offices`, formatList(items)])}\n`;
}
