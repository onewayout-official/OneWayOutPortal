import type { GiftcardStatusItem, YoyoGiftcard } from "@/lib/yoyo/types";

/** Remaining cents: prefer live `balance`, else issued − redeemed. */
export function remainingCentsFromCard(card: {
  balance?: number;
  issuedAmount?: number;
  redeemedAmount?: number;
}): number {
  if (card.balance != null && Number.isFinite(card.balance)) {
    return Math.max(0, Math.round(card.balance));
  }
  const issued = card.issuedAmount ?? 0;
  const redeemed = card.redeemedAmount ?? 0;
  if (Number.isFinite(issued) || Number.isFinite(redeemed)) {
    return Math.max(0, Math.round(issued - redeemed));
  }
  return 0;
}

/** Yoyo giftcard stateId: A Active, D Deactivated, E Expired, R Redeemed fully */
export function giftcardStatusFromState(stateId?: string | null): Pick<
  GiftcardStatusItem,
  "statusLabel" | "isActive"
> {
  switch ((stateId ?? "").toUpperCase()) {
    case "A":
      return { statusLabel: "Active", isActive: true };
    case "R":
      return { statusLabel: "Redeemed", isActive: false };
    case "E":
      return { statusLabel: "Expired", isActive: false };
    case "D":
      return { statusLabel: "Deactivated", isActive: false };
    default:
      return { statusLabel: "Unknown", isActive: false };
  }
}

export function toGiftcardStatusItem(card: YoyoGiftcard): GiftcardStatusItem {
  const remainingCents = remainingCentsFromCard(card);
  const redeemedAmount =
    card.redeemedAmount != null && Number.isFinite(card.redeemedAmount)
      ? card.redeemedAmount
      : undefined;
  const stateUpper = (card.stateId ?? "").toUpperCase();
  const base = giftcardStatusFromState(card.stateId);

  const isPartiallyRedeemed =
    stateUpper === "A" &&
    (redeemedAmount ?? 0) > 0 &&
    remainingCents > 0;

  const statusLabel = isPartiallyRedeemed
    ? ("Partially redeemed" as const)
    : base.statusLabel;

  const isActive =
    statusLabel === "Active" || statusLabel === "Partially redeemed"
      ? true
      : base.isActive;

  return {
    id: card.id,
    stateId: card.stateId,
    expiryDate: card.expiryDate,
    balance: card.balance,
    redeemedAmount,
    issuedAmount: card.issuedAmount,
    remainingCents,
    isPartiallyRedeemed,
    statusLabel,
    isActive,
  };
}

export function formatCentsAsRand(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Badge text for spending history / success UI. */
export function giftcardStatusBadgeText(status: GiftcardStatusItem): string {
  const left = formatCentsAsRand(status.remainingCents);
  switch (status.statusLabel) {
    case "Active":
      return `Active · R ${left} left`;
    case "Partially redeemed":
      return `Partially used · R ${left} left`;
    case "Redeemed":
      return "Redeemed · used";
    default:
      return status.statusLabel;
  }
}
