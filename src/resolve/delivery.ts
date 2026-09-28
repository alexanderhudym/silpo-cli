import type { FoundAddress } from "../mcp/entities/address.js";
import type { Branch } from "../mcp/entities/branch.js";
import type { CartAddress, CartTimeslot } from "../mcp/entities/cart.js";
import type { DeliveryOption, DeliveryType } from "../mcp/entities/delivery.js";
import type { NpOffice, NpSettlement } from "../mcp/entities/nova-poshta.js";
import type { TimeSlot } from "../mcp/entities/time-slot.js";
import type { CartShipmentRef, CreatableDeliveryType } from "../mcp/silpo.js";
import type { SilpoSurface } from "../mcp/surface.js";
import {
  type Coordinates,
  type DestinationScope,
  type PlaceCandidate,
  type PlaceClient,
  findBranch,
  coordinatesOf,
  listStores,
  looksLikeUuid,
  placeCandidatesText,
  resolveDestination,
} from "./stores.js";
import {
  type NovaPoshtaClient,
  officeCandidatesText,
  resolveNovaPoshta,
  settlementCandidatesText,
} from "./nova-poshta.js";
import { greatCircleKm } from "../utils/distance.js";
import type { ParsedTime } from "../utils/datetime.js";
import { formatList, formatRows } from "../utils/list.js";
import { formatEntryAsRow } from "../utils/record.js";

const PREFERRED_COURIER: DeliveryType = "DeliveryHome";

export type ResolvedDestination = {
  readonly deliveryType: CreatableDeliveryType;
  readonly shipment: CartShipmentRef;
  readonly address: CartAddress;
  readonly geocoded?: FoundAddress;
};

export type DestinationResolution =
  | { readonly outcome: "resolved"; readonly destination: ResolvedDestination }
  | { readonly outcome: "ambiguous"; readonly text: string }
  | { readonly outcome: "none" };

export type DestinationClient = PlaceClient &
  NovaPoshtaClient &
  Pick<SilpoSurface, "getAvailableDeliveryTypes" | "getTimeSlots">;

function asCartAddress(fields: Record<string, string | undefined>): CartAddress {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as unknown as CartAddress;
}

function selfPickupAddress(branch: Branch): CartAddress {
  if (branch.latitude === null || branch.longitude === null) {
    throw new Error(`the store ${branch.branchId} carries no coordinates`);
  }

  return asCartAddress({
    addressType: "self-pickup",
    latitude: String(branch.latitude),
    longitude: String(branch.longitude),
    city: branch.city ?? undefined,
    street: branch.address ?? undefined,
  });
}

function courierAddress(candidate: PlaceCandidate, coordinates: Coordinates): CartAddress {
  const base = {
    addressType: "house",
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  };

  if (candidate.kind === "saved") {
    const { city, street, building } = candidate.address;

    return asCartAddress({
      ...base,
      city: city ?? undefined,
      street: street ?? undefined,
      house: building ?? undefined,
    });
  }

  if (candidate.kind === "address") {
    const { city, street, houseNumber, district } = candidate.address;

    return asCartAddress({
      ...base,
      city: city ?? undefined,
      street: street ?? undefined,
      house: houseNumber ?? undefined,
      district: district ?? undefined,
    });
  }

  throw new Error("a store destination has no courier address");
}

function novaPoshtaAddress(settlement: NpSettlement, office: NpOffice): CartAddress {
  return asCartAddress({
    addressType: "nova-poshta",
    latitude: String(office.latitude),
    longitude: String(office.longitude),
    officeId: office.id,
    city: settlement.title,
  });
}

function courierCandidateText({ deliveryType, branchId, description }: DeliveryOption): string {
  return formatRows([
    formatEntryAsRow("type", deliveryType),
    branchId !== null && formatEntryAsRow("branchId", branchId),
    formatEntryAsRow("description", description),
  ]);
}

function courierOptionsText(options: readonly DeliveryOption[]): string {
  const items = options.map(courierCandidateText);

  return `${formatList([`Found ${options.length} matching delivery types`, formatList(items)])}\n`;
}

type CourierOption = DeliveryOption & { readonly branchId: string };

type CourierResolution =
  | { readonly outcome: "resolved"; readonly option: CourierOption }
  | { readonly outcome: "ambiguous"; readonly options: readonly CourierOption[] }
  | { readonly outcome: "none" };

function hasBranch(option: DeliveryOption): option is CourierOption {
  return option.branchId !== null;
}

function noCourierSlot(deliveryTypes: readonly string[], when?: ParsedTime): string {
  const label = whenLabel(when);
  const suffix = label === undefined ? "" : ` on ${label}`;

  return `no branch serving this destination has an available slot for ${deliveryTypes.join(", ")}${suffix}`;
}

function noPreferredSlot(alternatives: readonly string[], when?: ParsedTime): string {
  const label = whenLabel(when);
  const suffix = label === undefined ? "" : ` on ${label}`;
  const verb = alternatives.length === 1 ? "has" : "have";

  return `${PREFERRED_COURIER} has no available time slot${suffix}; ${alternatives.join(", ")} ${verb} one — pass --delivery-type to choose explicitly`;
}

function doesNotServe(deliveryType: string): string {
  return `${deliveryType} does not serve this destination`;
}

function noStoreMatched(text: string): string {
  return `no store matches ${JSON.stringify(text)} — self-pickup is collected from a store, not from an address; list them with "stores <settlement> --pickup" and pass a branch id back to --to`;
}

async function slotFilter(
  client: Pick<SilpoSurface, "getTimeSlots">,
  options: readonly CourierOption[],
  when?: ParsedTime,
): Promise<readonly CourierOption[]> {
  const slots = await Promise.all(
    options.map((option) => tryFindSlot(client, option.branchId, option.deliveryType, when)),
  );

  return options.filter((_option, index) => slots[index] !== null);
}

async function resolveCourierType(
  client: Pick<SilpoSurface, "getAvailableDeliveryTypes" | "getTimeSlots">,
  coordinates: Coordinates,
  when?: ParsedTime,
  override?: DeliveryType,
): Promise<CourierResolution> {
  const { structured } = await client.getAvailableDeliveryTypes({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  const courier = structured.options.filter(hasBranch);

  if (override !== undefined) {
    const chosen = courier.find((option) => option.deliveryType === override);

    if (chosen === undefined) throw new Error(doesNotServe(override));

    return { outcome: "resolved", option: chosen };
  }

  if (courier.length === 0) return { outcome: "none" };

  const preferred = courier.find((option) => option.deliveryType === PREFERRED_COURIER);

  if (preferred !== undefined) {
    const slot = await tryFindSlot(client, preferred.branchId, preferred.deliveryType, when);

    if (slot !== null) return { outcome: "resolved", option: preferred };

    const others = courier.filter((option) => option !== preferred);
    const servingOthers = await slotFilter(client, others, when);

    if (servingOthers.length === 0) {
      throw new Error(noCourierSlot(courier.map((option) => option.deliveryType), when));
    }

    throw new Error(
      noPreferredSlot(
        servingOthers.map((option) => option.deliveryType),
        when,
      ),
    );
  }

  const serving = await slotFilter(client, courier, when);

  if (serving.length === 0) {
    throw new Error(noCourierSlot(courier.map((option) => option.deliveryType), when));
  }
  if (serving.length === 1) return { outcome: "resolved", option: serving[0]! };

  return { outcome: "ambiguous", options: serving };
}

async function resolveFromPlace(
  client: DestinationClient,
  candidate: PlaceCandidate,
  when?: ParsedTime,
  deliveryType?: DeliveryType,
): Promise<DestinationResolution> {
  if (candidate.kind === "store") {
    const { branch } = candidate;

    if (branch.companyId === null) throw new Error(`the store ${branch.branchId} carries no company`);
    if (deliveryType !== undefined && deliveryType !== "SelfPickup") {
      throw new Error(doesNotServe(deliveryType));
    }

    return {
      outcome: "resolved",
      destination: {
        deliveryType: "SelfPickup",
        shipment: { companyId: branch.companyId, branchId: branch.branchId },
        address: selfPickupAddress(branch),
      },
    };
  }

  const coordinates = coordinatesOf(candidate);

  if (coordinates === null) throw new Error("the destination has no coordinates");

  const courier = await resolveCourierType(client, coordinates, when, deliveryType);

  if (courier.outcome === "ambiguous") return { outcome: "ambiguous", text: courierOptionsText(courier.options) };
  if (courier.outcome === "none") return { outcome: "none" };

  const { option } = courier;
  const branch = await findBranch(client, option.branchId);

  if (branch === null) throw new Error(`no branch ${option.branchId}`);
  if (branch.companyId === null) throw new Error(`the branch ${branch.branchId} carries no company`);

  return {
    outcome: "resolved",
    destination: {
      deliveryType: option.deliveryType as CreatableDeliveryType,
      shipment: { companyId: branch.companyId, branchId: branch.branchId },
      address: courierAddress(candidate, coordinates),
      ...(candidate.kind === "address" ? { geocoded: candidate.address } : {}),
    },
  };
}

async function nearestNpBranch(client: DestinationClient, point: Coordinates): Promise<Branch> {
  const { branches } = await listStores(client, { hasNP: true });
  const located = branches.flatMap((branch) =>
    branch.latitude === null || branch.longitude === null
      ? []
      : [
          {
            branch,
            distance: greatCircleKm(point, {
              latitude: Number(branch.latitude),
              longitude: Number(branch.longitude),
            }),
          },
        ],
  );

  located.sort((left, right) => left.distance - right.distance);

  const nearest = located[0];

  if (nearest === undefined) throw new Error("no branch serves Nova Poshta near the resolved office");

  return nearest.branch;
}

async function resolveNovaPoshtaDestination(
  client: DestinationClient,
  text: string,
  deliveryType?: DeliveryType,
): Promise<DestinationResolution> {
  const at = text.indexOf(",");
  const settlementText = (at < 0 ? text : text.slice(0, at)).trim();
  const officeText = at < 0 ? undefined : text.slice(at + 1).trim();

  if (settlementText === "") return { outcome: "none" };
  if (deliveryType !== undefined && deliveryType !== "NovaPoshta") {
    throw new Error(doesNotServe(deliveryType));
  }

  const np = await resolveNovaPoshta(client, settlementText, officeText === "" ? undefined : officeText);

  if (np.outcome === "ambiguous-settlement") {
    return { outcome: "ambiguous", text: settlementCandidatesText(np.candidates) };
  }
  if (np.outcome === "ambiguous-office") {
    return { outcome: "ambiguous", text: officeCandidatesText(np.candidates) };
  }
  if (np.outcome === "no-settlement" || np.outcome === "no-office") return { outcome: "none" };

  const { settlement, office } = np;
  const branch = await nearestNpBranch(client, { latitude: office.latitude, longitude: office.longitude });

  if (branch.companyId === null) throw new Error(`the branch ${branch.branchId} carries no company`);

  return {
    outcome: "resolved",
    destination: {
      deliveryType: "NovaPoshta",
      shipment: { companyId: branch.companyId, branchId: branch.branchId },
      address: novaPoshtaAddress(settlement, office),
    },
  };
}

export async function resolveCartDestination(
  client: DestinationClient,
  text: string,
  when?: ParsedTime,
  deliveryType?: DeliveryType,
): Promise<DestinationResolution> {
  // A named delivery type says what kind of place the text has to be, so it picks the listings
  // rather than being checked against whatever the cascade happened to land on. Self-pickup is
  // served by a store and nothing else; Nova Poshta by an office and nothing else; a courier by
  // neither. Landing on the wrong kind used to surface as "this type does not serve the
  // destination", which sends the caller to change the one part of the request that was right.
  if (deliveryType === "NovaPoshta") return resolveNovaPoshtaDestination(client, text, deliveryType);

  const scope: DestinationScope =
    deliveryType === undefined ? "any" : deliveryType === "SelfPickup" ? "store" : "courier";
  const place = await resolveDestination(client, text, scope);

  if (place.outcome === "ambiguous") {
    return { outcome: "ambiguous", text: placeCandidatesText(place.candidates) };
  }
  if (place.outcome === "resolved") return resolveFromPlace(client, place.candidate, when, deliveryType);
  if (looksLikeUuid(text)) throw new Error(`no branch ${text.trim()}`);
  if (scope === "store") throw new Error(noStoreMatched(text));

  return resolveNovaPoshtaDestination(client, text, deliveryType);
}

function localDate(iso: string): Temporal.PlainDate {
  return Temporal.Instant.from(iso).toZonedDateTimeISO(Temporal.Now.timeZoneId()).toPlainDate();
}

function startInstant(slot: TimeSlot): Temporal.Instant {
  return Temporal.Instant.from(slot.start);
}

function whenLabel(when?: ParsedTime): string | undefined {
  if (when === undefined) return undefined;

  return when.kind === "day" ? when.date.toString() : when.instant.toString();
}

function noSlotFor(deliveryType: string, branchId: string, when?: string): string {
  const suffix = when === undefined ? "" : ` on ${when}`;

  return `the branch ${branchId} offers no available time slot for ${deliveryType}${suffix}`;
}

async function tryFindSlot(
  client: Pick<SilpoSurface, "getTimeSlots">,
  branchId: string,
  deliveryType: string,
  when?: ParsedTime,
): Promise<CartTimeslot | null> {
  const { structured } = await client.getTimeSlots({
    branchId,
    deliveryTypes: [deliveryType as DeliveryType],
  });
  const slots = structured.slots;

  if (when === undefined) {
    const slot = slots.find((one) => one.available);

    return slot === undefined ? null : { start: slot.start, end: slot.end };
  }

  if (when.kind === "day") {
    const matching = slots
      .filter((slot) => slot.available && localDate(slot.start).equals(when.date))
      .sort((left, right) => Temporal.Instant.compare(startInstant(left), startInstant(right)));
    const slot = matching[0];

    return slot === undefined ? null : { start: slot.start, end: slot.end };
  }

  const target = when.instant.epochMilliseconds;
  const slot = slots.find(
    (one) =>
      one.available &&
      Temporal.Instant.from(one.start).epochMilliseconds <= target &&
      target < Temporal.Instant.from(one.end).epochMilliseconds,
  );

  return slot === undefined ? null : { start: slot.start, end: slot.end };
}

export async function selectSlot(
  client: Pick<SilpoSurface, "getTimeSlots">,
  branchId: string,
  deliveryType: string,
  when?: ParsedTime,
): Promise<CartTimeslot> {
  const slot = await tryFindSlot(client, branchId, deliveryType, when);

  if (slot === null) throw new Error(noSlotFor(deliveryType, branchId, whenLabel(when)));

  return slot;
}
