import type { Command } from "commander";

import { silpo } from "../daemon/client.js";
import type {
  FindNovaPoshtaOfficesResult,
  FindNovaPoshtaSettlementsResult,
} from "../mcp/silpo.js";
import { formatCoordinate } from "../utils/coordinate.js";
import { formatList, formatRows } from "../utils/list.js";
import { formatEntryAsRow } from "../utils/record.js";
import { toOneLine } from "../utils/text.js";

export function settlementsText(payload: FindNovaPoshtaSettlementsResult): string {
  const items = payload.settlements.map(({ id, title, area, region }) =>
    formatRows([
      formatEntryAsRow("id", id),
      formatEntryAsRow("title", title),
      area && formatEntryAsRow("area", area),
      region && formatEntryAsRow("region", region),
    ]),
  );

  const body = formatList([payload.summary, formatList(items)]);

  return `${body}\n`;
}

const WORKING = "Working";

export function officesText(payload: FindNovaPoshtaOfficesResult): string {
  const items = payload.offices.map(({ id, title, status, latitude, longitude }) =>
    formatRows([
      formatEntryAsRow("id", id),
      formatEntryAsRow(
        "coordinates",
        `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`,
      ),
      status !== WORKING && formatEntryAsRow("status", status),
      toOneLine(title),
    ]),
  );

  const body = formatList([payload.summary, formatList(items)]);

  return `${body}\n`;
}

export function registerNpCommand(program: Command): void {
  program
    .command("np")
    .description(
      "Nova Poshta settlements matching a name, or, with --office, the offices inside the one settlement that name resolves to",
    )
    .argument("<settlement>", "settlement name, as it is spoken")
    .option("--office <text>", "narrow to the offices in that settlement matching this name")
    .action(async (settlement: string, options: { office?: string }) => {
      const { structured: settlements } = await silpo.findNovaPoshtaSettlements({
        title: settlement,
      });

      if (options.office === undefined) {
        process.stdout.write(settlementsText(settlements));
        return;
      }

      if (settlements.settlements.length !== 1) {
        process.stdout.write(settlementsText(settlements));

        if (settlements.settlements.length > 1) process.exitCode = 1;

        return;
      }

      const { structured: offices } = await silpo.findNovaPoshtaOffices({
        settlementId: settlements.settlements[0]!.id,
        title: options.office,
      });

      process.stdout.write(officesText(offices));
    });
}
