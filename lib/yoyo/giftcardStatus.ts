import type { GiftcardStatusItem, YoyoGiftcard } from "@/lib/yoyo/types";

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
  const { statusLabel, isActive } = giftcardStatusFromState(card.stateId);
  return {
    id: card.id,
    stateId: card.stateId,
    expiryDate: card.expiryDate,
    balance: card.balance,
    redeemedAmount: card.redeemedAmount,
    statusLabel,
    isActive,
  };
}
