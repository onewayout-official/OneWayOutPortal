/**
 * Yoyo Retail Footprint — April 2026 (from client PDF).
 * Used on the Spend page: tabs → store list → gift card issue.
 */

export interface RetailStore {
  id: string;
  name: string;
  storeCount?: number;
  /** Product-specific vouchers supported */
  productVouchers?: boolean;
  /** QR scanning at till */
  qrScanning?: boolean;
  /** API-only issue (no breakage) — e.g. Takealot */
  apiOnly?: boolean;
}

export interface RetailTab {
  id: string;
  label: string;
  subtitle?: string;
  stores: RetailStore[];
}

function store(name: string, count?: number, opts?: Partial<RetailStore>): RetailStore {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id,
    name,
    storeCount: count,
    productVouchers: true,
    qrScanning: true,
    ...opts,
  };
}

export const RETAIL_FOOTPRINT_TABS: RetailTab[] = [
  {
    id: "fmcg",
    label: "Fast-moving Consumer Goods",
    stores: [
      store("Boxer", 315),
      store("Checkers", 476),
      store("Checkers Hyper", 40),
      store("Checkers Liquor", 212),
      store("Shoprite", 553),
      store("Shoprite Hyper", 3),
      store("Shoprite Knect", 12),
      store("Shoprite Liquor", 421),
      store("Shoprite Mini", 62),
      store("Usave", 249),
      store("Usave Box", 50),
      store("Usave Box Mobile", 14),
      store("Super Usave", 1),
      store("Pick n Pay", 768),
      store("Pick n Pay Express", 206),
      store("Pick n Pay Clothing", 332),
      store("Pick n Pay Liquor", 13),
      store("Food Lovers Market", 79),
    ],
  },
  {
    id: "furniture-electronics",
    label: "Furniture & Appliances",
    subtitle: "Other",
    stores: [
      store("Bradlows Furniture", 242),
      store("Sleepmasters", 256),
      store("Russells Furniture", 257),
      store("Rochester Furniture", 48),
      store("Home Tech Sleep", 5),
      store("Hirsch's", 26),
    ],
  },
  {
    id: "cellular-electronics",
    label: "Cellular and Electronics",
    subtitle: "Other",
    stores: [
      store("Cellucity", 39),
      store("HiFi Corporation", 55),
      store("Incredible Connection", 92),
      store("iStore", 45),
      store("Vodacom", 521),
      store("WeFix", 4),
      store("TechMarkit", 2),
    ],
  },
  {
    id: "clothing",
    label: "Clothing",
    stores: [
      store("Ackermans", 970),
      store("Cape Union Mart", 127),
      store("Footgear", 169),
      store("Nike", 9),
      store("Old Khaki", 94),
      store("Pick n Pay Clothing", 332),
      store("Poetry", 56),
      store("Polo", 25),
      store("UNIQ", 17),
      store("Fashion Fusion", 76),
    ],
  },
  {
    id: "convenience",
    label: "Petrochemical Convenience",
    stores: [
      store("Engen Convenience", 696),
      store("Shell Convenience", 566),
      store("Total Convenience", 472),
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy, Health and Beauty",
    stores: [
      store("Dis-Chem", 236),
      store("Baby City", 249),
      store("Mangwanani Spa", 21),
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle and Entertainment",
    stores: [
      store("Bounce Inc", 4),
      store("Build-A-Bear Workshop", 8),
      store("The Golfers Club", 6),
      store("Hamleys", 5),
      store("Le Creuset", 21),
      store("Outdoor Warehouse", 38),
      store("Sportsmans Warehouse", 49),
      store("Sunglass Hut", 72),
      store("Toy Kingdom", 25),
      store('Toys/Babies "R" Us', 50),
      store("Safari Outdoor", 9),
    ],
  },
  {
    id: "vehicle",
    label: "Vehicle Maintenance",
    stores: [
      store("Tiger Wheel & Tyre", 127),
      store("Tyres and More", 20),
    ],
  },
  {
    id: "restaurants",
    label: "Restaurants and Fast Foods",
    stores: [
      store("KFC", 1184),
      store("Krispy Kreme", 95),
      store("Milky Lane", 112),
      store("Mugg & Bean", 306),
      store("Mythos", 8),
      store("Nando's", 302),
      store("Nü Health", 13),
      store("Lupa Osteria", 15),
      store("Panarottis", 91),
      store("Bootlegger", 112),
      store("Burger King", 174),
      store("Chateau Gateaux", 25),
      store("Col'Cacchio", 25),
      store("Debonairs Pizza", 730),
      store("Fishaways", 260),
      store("Hungry Lion", 292),
      store("John Dory's", 40),
      store("Kauai", 230),
      store("Knead", 12),
      store("Wimpy", 471),
      store("Primi Piatti", 18),
      store("Vida e caffé", 365),
      store("Plato", 133),
      store("Pret a Manger", 2),
      store("Rocomamas", 88),
      store("Salsa Mexican Grill", 10),
      store("Spur", 306),
      store("Starbucks", 74),
      store("Steers", 723),
      store("Sweetbeet", 9),
      store("Turn 'n Tender", 16),
    ],
  },
  {
    id: "online",
    label: "Online",
    stores: [
      store("Cape Union Mart"),
      store("Cielo"),
      store("Old Khaki"),
      store("Poetry"),
      store("KFC"),
      store("Outdoor Warehouse"),
      store("Sportsmans Warehouse"),
      store("Steers"),
      store("Milky Lane"),
      store("Debonairs"),
      store("Fishaways"),
      store('Toys/Babies "R" Us'),
      store("Mr D"),
      store("Samsung Adjoa"),
      store("Snapplify"),
      store("Sweepsouth"),
      store("Admyt"),
      store("Loot.co.za"),
      store("Nando's"),
      store("Dis-Chem"),
      store("Netflorist"),
      store("Takealot", undefined, { apiOnly: true }),
      store("Isabella Garcia"),
      store("iStore"),
      store("Tiger Wheel & Tyre"),
      store("Tyres & More"),
      store("Finishing Touches"),
      store("UCOOK"),
      store("Dress Your Tech"),
    ],
  },
  {
    id: "africa",
    label: "Africa",
    stores: [
      store("KFC Eswatini", 8),
      store("KFC Ivory Coast", 6),
      store("Nando's Eswatini", 5),
      store("Debonairs Eswatini", 4),
      store("Steers Eswatini", 1),
      store("Simbisa Brands Zimbabwe", 400),
      store("Hungry Lion Namibia", 29),
      store("Hungry Lion Zambia", 21),
      store("Hungry Lion Lesotho", 2),
      store("Hungry Lion Eswatini", 1),
      store("Hungry Lion Zimbabwe", 5),
      store("Hungry Lion Mauritius", 1),
      store("KFC Namibia", 22),
      store("KFC Lesotho", 10),
      store("KFC Botswana", 19),
    ],
  },
  {
    id: "coming-soon",
    label: "Coming soon",
    stores: [],
  },
];

/** 1 point = 1 cent (100 points = R1.00) */
export const POINTS_PER_RAND = 100;

export function randToPoints(rand: number): number {
  return Math.round(rand * POINTS_PER_RAND);
}

export function pointsToRand(points: number): number {
  return points / POINTS_PER_RAND;
}

export function randToCents(rand: number): number {
  return Math.round(rand * 100);
}

export function findStoreById(storeId: string): RetailStore | undefined {
  for (const tab of RETAIL_FOOTPRINT_TABS) {
    const found = tab.stores.find((s) => s.id === storeId);
    if (found) return found;
  }
  return undefined;
}
