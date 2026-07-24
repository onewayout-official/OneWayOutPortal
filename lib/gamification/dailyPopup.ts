import { getLocalDateString } from "./config";

const PREFIX = "onewayout:daily-rewards-popup:";

export function getDailyPopupDismissedKey(date = getLocalDateString()): string {
  return `${PREFIX}${date}`;
}

export function wasDailyPopupDismissed(date = getLocalDateString()): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(getDailyPopupDismissedKey(date)) === "1";
}

export function markDailyPopupDismissed(date = getLocalDateString()): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getDailyPopupDismissedKey(date), "1");
}
