import type { ToolCallOutcome } from "../mcp/session.js";
import type {
  AddOrUpdateCartProductsResult,
  AddOrUpdateCertificatesResult,
  CartProductInput,
  CartProductRef,
  ClearShoppingCartResult,
  RemoveCartProductsResult,
} from "../mcp/silpo.js";
import type {
  CartChange,
  CartState,
  CertificateChange,
  DeliveryChange,
  DeliveryConfirmation,
} from "./cart.js";
import type { ResolveAnswer, ResolveListResult } from "./fill.js";

export interface DaemonStatus {
  readonly pid: number;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly idleTimeoutMs: number;
  readonly idleExpiresAt: string;
  readonly baseUrl: string;
  readonly sessionId: string | null;
  readonly serverInfo: { name: string; version: string } | null;
  readonly toolCount: number;
  readonly requestsServed: number;
}

export type {
  CartChange,
  CertificateChange,
  CartState,
  DeliveryChange,
  DeliveryConfirmation,
  ResolveAnswer,
  ResolveListResult,
  ToolCallOutcome,
};

export interface ToolCallParams {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface DaemonMethods {
  ping: { params: Record<string, never>; result: { pong: true } };
  status: { params: Record<string, never>; result: DaemonStatus };
  stop: { params: Record<string, never>; result: { stopping: true } };
  callTool: { params: ToolCallParams; result: ToolCallOutcome };
  cartCurrent: { params: Record<string, never>; result: CartState };
  cartAdd: {
    params: { products: CartProductInput[] };
    result: CartChange<AddOrUpdateCartProductsResult>;
  };
  cartRemove: {
    params: { products: CartProductRef[] };
    result: CartChange<RemoveCartProductsResult>;
  };
  cartClear: { params: Record<string, never>; result: CartChange<ClearShoppingCartResult> };
  cartSetup: {
    params: { change: DeliveryChange };
    result: CartChange<DeliveryConfirmation>;
  };
  cartCertificates: {
    params: CertificateChange;
    result: CartChange<AddOrUpdateCertificatesResult>;
  };
  resolveList: {
    params: { items: string[]; answers: ResolveAnswer[] };
    result: ResolveListResult;
  };
}

export type DaemonMethod = keyof DaemonMethods;
export type DaemonParams<M extends DaemonMethod> = DaemonMethods[M]["params"];
export type DaemonResult<M extends DaemonMethod> = DaemonMethods[M]["result"];

export type DaemonRequest<M extends DaemonMethod = DaemonMethod> = {
  [K in M]: {
    readonly id: string;
    readonly method: K;
    readonly params: DaemonParams<K>;
  };
}[M];

export type DaemonResponse<M extends DaemonMethod = DaemonMethod> =
  | { readonly id: string; readonly ok: true; readonly result: DaemonResult<M> }
  | {
      readonly id: string;
      readonly ok: false;
      readonly error: { readonly message: string };
    };

const METHODS = new Set<string>([
  "ping",
  "status",
  "stop",
  "callTool",
  "cartCurrent",
  "cartAdd",
  "cartRemove",
  "cartClear",
  "cartSetup",
  "cartCertificates",
  "resolveList",
]);

export function isDaemonMethod(value: unknown): value is DaemonMethod {
  return typeof value === "string" && METHODS.has(value);
}

export interface StartupError {
  readonly message: string;
  readonly at: string;
}
