import {
  RETAIL_FOOTPRINT_TABS,
  store,
  type RetailStore,
  type RetailTab,
} from "@/lib/yoyo/retailFootprint";

export type SpendCountry = "ZA" | "NA";

export const SPEND_COUNTRY_STORAGE_KEY = "spend-country";

export const SPEND_COUNTRIES = [
  { code: "ZA" as const, label: "South Africa" },
  { code: "NA" as const, label: "Namibia" },
];

export const NAMIBIA_SPEND_CATEGORIES = [
  { id: "fuel" as const, name: "Fuel" },
  { id: "groceries" as const, name: "Groceries" },
  { id: "airtime" as const, name: "Airtime" },
  { id: "electricity" as const, name: "Electricity" },
  { id: "water" as const, name: "Water" },
];

export const NAMIBIA_RETAIL_STORES: RetailStore[] = [
  store("Hungry Lion Namibia", 29),
  store("KFC Namibia", 22),
];

export function isSpendCountry(value: string | null | undefined): value is SpendCountry {
  return value === "ZA" || value === "NA";
}

export function readStoredSpendCountry(): SpendCountry {
  if (typeof window === "undefined") return "ZA";
  const stored = localStorage.getItem(SPEND_COUNTRY_STORAGE_KEY);
  return isSpendCountry(stored) ? stored : "ZA";
}

export function persistSpendCountry(country: SpendCountry): void {
  try {
    localStorage.setItem(SPEND_COUNTRY_STORAGE_KEY, country);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getRetailTabsForCountry(country: SpendCountry): RetailTab[] {
  if (country === "NA") return [];
  return RETAIL_FOOTPRINT_TABS;
}

export function getStoresForCountry(country: SpendCountry, activeTabId?: string): RetailStore[] {
  if (country === "NA") return NAMIBIA_RETAIL_STORES;
  const tab =
    RETAIL_FOOTPRINT_TABS.find((t) => t.id === activeTabId) ?? RETAIL_FOOTPRINT_TABS[0];
  return tab.stores;
}

export function getSpendTabId(country: SpendCountry, activeTabId: string): string {
  return country === "NA" ? "namibia" : activeTabId;
}

export function getSpendCategoryLabel(country: SpendCountry, activeTabLabel: string): string {
  return country === "NA" ? "Namibia" : activeTabLabel;
}
