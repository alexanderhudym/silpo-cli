import type {
  Cart as CartContents,
  CartAddress,
  CartLoyalty,
  CartShipment,
  CartTimeslot,
} from "../mcp/entities/cart.js";
import type { DeliveryType } from "../mcp/entities/delivery.js";
import type { McpSession } from "../mcp/session.js";
import type {
  AddOrUpdateCartProductsResult,
  AddOrUpdateCertificatesResult,
  CartProductInput,
  CartProductRef,
  CartAddressType,
  CartShipmentRef,
  CertificateInput,
  ClearShoppingCartResult,
  CreatableDeliveryType,
  FeedbackChanges,
  FeedbackContacts,
  RemoveCartProductsResult,
  UpdateShoppingCartResult,
} from "../mcp/silpo.js";
import { toEpochMs } from "../utils/datetime.js";

const TIMESLOT = "timeslot";
const ERROR = "error";

const NO_SHIPMENT = "the cart names no branch";
const SLOT_UNUSABLE =
  "the cart's delivery slot cannot be booked and no slot at the branch is available to replace it";

function slotRefusal(cause: string | null): string {
  return cause === null
    ? SLOT_UNUSABLE
    : `the cart's delivery slot cannot be booked and repairing it failed: ${cause}`;
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
const NO_CART = "this account has no shopping cart";
const NO_COORDINATES = "opening a cart needs an address carrying latitude and longitude";
const NO_OPENING_BRANCH = "opening a cart needs a branch";
const NO_OPENING_TIMESLOT = "opening a cart needs a time slot";
const NO_OPENING_TYPE = "opening a cart needs a delivery type";

export type CartState = {
  cart: CartContents;
  loyalty: CartLoyalty | null;
  checkoutWebLink?: string;
  checkoutMobileLink?: string;
};

export function cartShipment(cart: CartContents): CartShipment {
  const first = cart.shipments[0];

  if (first === undefined) throw new Error(NO_SHIPMENT);

  return first;
}

export type CartChange<Confirmed> = {
  confirmed: Confirmed;
  state: CartState;
};

export type DeliveryChange = {
  deliveryType?: string;
  timeslot?: CartTimeslot;
  address?: CartAddress;
  shipments?: CartShipmentRef[];
  branchId?: string;
  feedbackChanges?: FeedbackChanges;
  feedbackContacts?: FeedbackContacts;
  isAdultConfirmed?: boolean;
  promoCode?: string | null;
  bonusRequested?: number | null;
};

export type CertificateChange = {
  add?: CertificateInput[];
  remove?: CertificateInput[];
};

export type DeliveryConfirmation = {
  success: boolean;
  summary: string;
  opened: boolean;
};

function addressTypeFor(deliveryType: string): CartAddressType {
  if (deliveryType === "SelfPickup") return "self-pickup";
  if (deliveryType === "NovaPoshta") return "nova-poshta";

  return "house";
}

function noSlot(deliveryType: string): string {
  return `the branch offers no available time slot for ${deliveryType}`;
}

function ended({ end }: CartTimeslot): boolean {
  try {
    return toEpochMs(end) <= Date.now();
  } catch {
    return true;
  }
}

function badSlotReported(cart: CartContents): boolean {
  return cart.calculation.validations.some(
    ({ level, type }) => level === ERROR && type === TIMESLOT,
  );
}

export function reportsBadSlot({ cart }: CartState): boolean {
  return badSlotReported(cart);
}

function lapsedCart(cart: CartContents): boolean {
  return ended(cart.timeslot) || badSlotReported(cart);
}

function lapsed(state: CartState): boolean {
  return lapsedCart(state.cart);
}

async function firstAvailableSlot(
  session: McpSession,
  branchId: string,
  deliveryType: string,
): Promise<CartTimeslot> {
  const { structured } = await session.getTimeSlots({
    branchId,
    deliveryTypes: [deliveryType as DeliveryType],
  });
  const slot = structured.slots.find(({ available }) => available);

  if (slot === undefined) throw new Error(noSlot(deliveryType));

  return { start: slot.start, end: slot.end };
}

function coordinate(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) throw new Error(NO_COORDINATES);

  return parsed;
}

async function read(session: McpSession, shoppingCartId: string): Promise<CartState> {
  const { structured } = await session.getShoppingCartById({ shoppingCartId });

  return {
    cart: structured.cart,
    loyalty: structured.loyalty,
    ...(structured.checkoutWebLink === undefined
      ? {}
      : { checkoutWebLink: structured.checkoutWebLink }),
    ...(structured.checkoutMobileLink === undefined
      ? {}
      : { checkoutMobileLink: structured.checkoutMobileLink }),
  };
}

export class Cart {
  private state: CartState | null = null;

  private repairFailure: string | null = null;

  constructor(private readonly session: McpSession) {}

  async current(): Promise<CartState> {
    const id = await this.activeId();

    if (id !== null) return this.refresh(id);

    const previous = this.state;

    this.state = null;

    if (previous === null) throw new Error(NO_CART);

    return this.reopen(previous.cart);
  }

  private async activeId(): Promise<string | null> {
    const { structured } = await this.session.getMyShoppingCart();

    return structured.exists && structured.shoppingCartId !== null
      ? structured.shoppingCartId
      : null;
  }

  private async hold(id: string): Promise<CartState> {
    this.state = await read(this.session, id);

    return this.state;
  }

  private async refresh(id: string): Promise<CartState> {
    this.state = await read(this.session, id);

    await this.settle();

    return this.state;
  }

  async addProducts(
    products: CartProductInput[],
  ): Promise<CartChange<AddOrUpdateCartProductsResult>> {
    const { cart } = await this.writable();
    const { structured } = await this.session.addOrUpdateCartProducts({
      shoppingCartId: cart.id,
      products,
    });

    return this.changed(structured, cart.id);
  }

  async removeProducts(products: CartProductRef[]): Promise<CartChange<RemoveCartProductsResult>> {
    const { cart } = await this.writable();
    const { structured } = await this.session.removeCartProducts({
      shoppingCartId: cart.id,
      products,
    });

    return this.changed(structured, cart.id);
  }

  async clear(): Promise<CartChange<ClearShoppingCartResult>> {
    const { cart } = await this.writable();
    const { structured } = await this.session.clearShoppingCart({
      shoppingCartId: cart.id,
    });

    return this.changed(structured, cart.id);
  }

  async setup(change: DeliveryChange): Promise<CartChange<DeliveryConfirmation>> {
    const id = await this.activeId();

    if (id === null) return this.open(change);

    const { cart } = await this.hold(id);
    const { structured } = await this.session.updateShoppingCart({
      shoppingCartId: cart.id,
      deliveryType: change.deliveryType ?? cart.deliveryType,
      timeslot: await this.destinedSlot(cart, change),
      address: change.address ?? cart.address,
      shipments:
        change.shipments ??
        cart.shipments.map(({ companyId, branchId }) => ({
          companyId,
          branchId,
        })),
      branchId: change.branchId,
      feedbackChanges: change.feedbackChanges,
      feedbackContacts: change.feedbackContacts,
      isAdultConfirmed: change.isAdultConfirmed,
      ...(change.promoCode === undefined ? {} : { promoCode: change.promoCode }),
      ...(change.bonusRequested === undefined ? {} : { bonusRequested: change.bonusRequested }),
    });

    return this.changed(
      {
        success: structured.success,
        summary: structured.summary,
        opened: false,
      },
      cart.id,
    );
  }

  /**
   * The slot the write is to carry, resolved without a write of its own. Repairing a lapsed slot
   * before this one lands would spend a cart write on the branch the call is leaving: every
   * destination change already arrives carrying a slot chosen for the branch it is moving to, and
   * that slot is about to replace whatever the repair wrote. The setting changes that carry no slot
   * — a promo code, a bonus request — are the ones that need the cart's own, and a lapsed one is
   * replaced here so it travels in the same write.
   */
  private async destinedSlot(cart: CartContents, change: DeliveryChange): Promise<CartTimeslot> {
    if (change.timeslot !== undefined) return change.timeslot;
    if (!lapsedCart(cart)) return cart.timeslot;

    const branchId =
      change.branchId ?? change.shipments?.[0]?.branchId ?? cartShipment(cart).branchId;

    return firstAvailableSlot(this.session, branchId, change.deliveryType ?? cart.deliveryType);
  }

  private async open(change: DeliveryChange): Promise<CartChange<DeliveryConfirmation>> {
    const { address, deliveryType, timeslot } = change;

    if (deliveryType === undefined) throw new Error(NO_OPENING_TYPE);
    if (timeslot === undefined) throw new Error(NO_OPENING_TIMESLOT);
    if (address === undefined) throw new Error(NO_COORDINATES);

    const branchId = change.branchId ?? change.shipments?.[0]?.branchId;

    if (branchId === undefined) throw new Error(NO_OPENING_BRANCH);

    const { structured } = await this.session.createShoppingCart({
      addressType:
        (address.addressType as CartAddressType | undefined) ?? addressTypeFor(deliveryType),
      latitude: coordinate(address.latitude),
      longitude: coordinate(address.longitude),
      deliveryType: deliveryType as CreatableDeliveryType,
      timeslot,
      branchId,
      ...(address.city == null ? {} : { city: address.city }),
      ...(address.street == null ? {} : { street: address.street }),
      ...(address.house == null ? {} : { house: address.house }),
      ...(address.district == null ? {} : { district: address.district }),
    });

    return this.changed(
      {
        success: structured.success,
        summary: structured.summary,
        opened: true,
      },
      structured.shoppingCartId,
    );
  }

  private async reopen(previous: CartContents): Promise<CartState> {
    const { branchId } = cartShipment(previous);
    const { deliveryType, address, timeslot } = previous;
    const { state } = await this.open({
      deliveryType,
      address,
      branchId,
      timeslot: ended(timeslot)
        ? await firstAvailableSlot(this.session, branchId, deliveryType)
        : timeslot,
    });

    return state;
  }

  async certificates({
    add,
    remove,
  }: CertificateChange): Promise<CartChange<AddOrUpdateCertificatesResult>> {
    const { cart } = await this.writable();
    const { structured } = await this.session.addOrUpdateCertificates({
      shoppingCartId: cart.id,
      certificatesToAdd: add,
      certificatesToRemove: remove,
    });

    return this.changed(structured, cart.id);
  }

  private async changed<Confirmed>(
    confirmed: Confirmed,
    id: string,
  ): Promise<CartChange<Confirmed>> {
    this.state = await read(this.session, id);

    await this.settle();

    return { confirmed, state: this.state };
  }

  private async writable(): Promise<CartState> {
    const state = await this.current();

    if (lapsed(state)) throw new Error(slotRefusal(this.repairFailure));

    return state;
  }

  /**
   * A repair that cannot be made must not take down a read: the spec has reads served from a cart
   * whose slot could not be replaced, and only writes refused. So the reason is kept rather than
   * thrown, and `writable` speaks it. Swallowing it outright is what let a rate-limited repair be
   * reported as a branch with no slots left, while the slot listing was answering that it had
   * sixteen.
   */
  private async settle(): Promise<void> {
    this.repairFailure = null;

    if (this.state === null || !lapsed(this.state)) return;

    const { cart } = this.state;
    const branch = cart.shipments[0];

    if (branch === undefined) return;

    let timeslot: CartTimeslot;

    try {
      timeslot = await firstAvailableSlot(this.session, branch.branchId, cart.deliveryType);
    } catch (error) {
      this.repairFailure = reasonOf(error);

      return;
    }

    try {
      await this.session.updateShoppingCart({
        shoppingCartId: cart.id,
        deliveryType: cart.deliveryType,
        timeslot,
        address: cart.address,
        shipments: cart.shipments.map(({ companyId, branchId }) => ({ companyId, branchId })),
      });
    } catch (error) {
      this.repairFailure = reasonOf(error);
    }

    this.state = await read(this.session, cart.id);
  }
}
