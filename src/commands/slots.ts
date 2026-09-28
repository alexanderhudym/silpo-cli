import type { Command } from "commander";

import { shoppingCart, silpo } from "../daemon/client.js";
import { cartShipment } from "../daemon/cart.js";
import type { TimeSlot } from "../mcp/entities/time-slot.js";
import type { GetTimeSlotsResult } from "../mcp/silpo.js";
import { formatCostTiers } from "../utils/cost.js";
import { DELIVERY_TYPES, requireDeliveryType } from "../utils/delivery-type.js";
import { toEpochMs, toLocalTime, toUtc } from "../utils/datetime.js";
import { formatFlags } from "../utils/flags.js";
import { formatList, formatRows } from "../utils/list.js";
import { requireInteger } from "../utils/number.js";
import { formatEntryAsRow } from "../utils/record.js";

const CONSTRAINT_PREFIX = "isLimited";
const YES = "yes";
const NO = "no";

export type Window = { start?: string; end?: string };

export function withinWindow({ start, end }: Window): (slot: TimeSlot) => boolean {
  const from = start === undefined ? undefined : toEpochMs(start, "start");
  const until = end === undefined ? undefined : toEpochMs(end, "end");

  return (slot) =>
    (from === undefined || toEpochMs(slot.start) >= from) &&
    (until === undefined || toEpochMs(slot.end) <= until);
}

export function reachesPastHorizon(slots: readonly TimeSlot[], { start }: Window): boolean {
  if (start === undefined || slots.length === 0) return false;

  return toEpochMs(start, "start") > Math.max(...slots.map((slot) => toEpochMs(slot.end)));
}

function slotsSummary(slots: readonly TimeSlot[]): string {
  const available = slots.filter((slot) => slot.available).length;

  return `Found ${slots.length} time slots (${available} available)`;
}

export function slotsText(payload: GetTimeSlotsResult, kept?: readonly TimeSlot[]): string {
  const slots = kept ?? payload.slots;
  const summary = slots.length === payload.slots.length ? payload.summary : slotsSummary(slots);
  const items = slots.map(
    ({
      start,
      end,
      available,
      deliveryType,
      deliveryCost,
      deliveryCostMap,
      minOrderCost,
      maxWeight,
      constraints,
      fast,
    }) => {
      const limited = formatFlags(constraints, CONSTRAINT_PREFIX);
      const tiers = formatCostTiers(deliveryCostMap);

      return formatRows([
        `${toLocalTime(start)} - ${toLocalTime(end)}`,
        formatEntryAsRow("type", deliveryType),
        formatEntryAsRow("available", available ? YES : NO),
        deliveryCost !== null && formatEntryAsRow("cost", deliveryCost),
        tiers !== "" && formatEntryAsRow("tiers", tiers),
        formatEntryAsRow("minOrder", minOrderCost),
        maxWeight !== null && maxWeight > 0 && formatEntryAsRow("maxWeight", maxWeight),
        fast !== null && formatEntryAsRow("fast", `${fast.cost} in ${fast.time}`),
        limited !== "" && formatEntryAsRow("limited", limited),
      ]);
    },
  );

  const body = formatList([summary, formatList(items)]);

  return `${body}\n`;
}

async function branchOf(option: string | undefined): Promise<string> {
  if (option !== undefined) return option;

  const { cart } = await shoppingCart.current();

  return cartShipment(cart).branchId;
}

export function registerSlotsCommand(program: Command): void {
  program
    .command("slots")
    .description(
      "Delivery time slots of a branch, narrowed by delivery type and a time window; the cart's own branch when --branch is absent",
    )
    .option("--branch <uuid>", "branch uuid, the session cart's own when absent")
    .option(
      "--type <type>",
      `delivery type, repeatable: one of ${DELIVERY_TYPES.join(", ")}`,
      (value: string, seen: string[] = []) => [...seen, value],
    )
    .option("--limit <n>", "max slots to return")
    .option("--start <time>", "window start: today, tomorrow, a date, or a date and a time")
    .option("--end <time>", "window end: today, tomorrow, a date, or a date and a time")
    .action(
      async (options: {
        branch?: string;
        type?: string[];
        limit?: string;
        start?: string;
        end?: string;
      }) => {
        const branchId = await branchOf(options.branch);
        const window: Window = { start: options.start, end: options.end };
        const bounded = window.start !== undefined || window.end !== undefined;
        const limit = options.limit === undefined ? undefined : requireInteger(options.limit);
        const call = {
          branchId,
          deliveryTypes: options.type?.map(requireDeliveryType),
        };

        const first = await silpo.getTimeSlots({ ...call, limit: bounded ? undefined : limit });
        const payload = reachesPastHorizon(first.structured.slots, window)
          ? (
              await silpo.getTimeSlots({
                ...call,
                start: window.start === undefined ? undefined : toUtc(window.start, "start"),
                end: window.end === undefined ? undefined : toUtc(window.end, "end"),
              })
            ).structured
          : first.structured;

        const kept = payload.slots.filter(withinWindow(window)).slice(0, limit);
        const text = slotsText(payload, kept);

        process.stdout.write(text);
      },
    );
}
