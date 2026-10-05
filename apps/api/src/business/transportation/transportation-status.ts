import { ConflictException } from "@nestjs/common";

import { TRANSPORTATION_TRANSITIONS, type TransportationStatus } from "@material-square/types";



export function assertTransportationTransition(
  current: string | null,
  next: TransportationStatus | undefined,
) {
  if (!next || current === next) return;
  if (!current) {
    if (next === "PLANNED") return;
    throw new ConflictException(
      "Create a planned delivery before advancing its status",
    );
  }
  const allowed: readonly string[] =
    TRANSPORTATION_TRANSITIONS[current as TransportationStatus] || [];
  if (!allowed.includes(next))
    throw new ConflictException(
      `Delivery cannot move from ${current} to ${next}`,
    );
}
