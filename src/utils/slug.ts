import { toInteger } from "./number.js";

const EXTERNAL_ID_TAIL = /-(\d+)$/;

export function toExternalId(slug: string): number | null {
  const tail = EXTERNAL_ID_TAIL.exec(slug)?.[1];

  return tail === undefined ? null : toInteger(tail);
}
