import type { YoyoGiftcardCampaign } from "@/lib/yoyo/types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Map retailer names to sandbox campaign keywords (fuel / grocery demo). */
const KEYWORD_HINTS: Record<string, string[]> = {
  engen: ["fuel"],
  shell: ["fuel"],
  total: ["fuel"],
  boxer: ["grocery", "grocer"],
  checkers: ["grocery", "grocer"],
  shoprite: ["grocery", "grocer"],
  "picknpay": ["grocery", "grocer"],
  kfc: ["grocery", "food"],
  nandos: ["grocery", "food"],
};

export function matchCampaignForStore(
  storeName: string,
  campaigns: YoyoGiftcardCampaign[]
): YoyoGiftcardCampaign | null {
  if (!campaigns.length) return null;

  const storeNorm = normalize(storeName);
  let best: YoyoGiftcardCampaign | null = null;
  let bestScore = 0;

  for (const campaign of campaigns) {
    const label = normalize(
      [campaign.name, campaign.description].filter(Boolean).join(" ")
    );
    if (!label) continue;

    let score = 0;
    if (label.includes(storeNorm) || storeNorm.includes(label)) {
      score = Math.max(storeNorm.length, label.length);
    } else {
      const tokens = storeNorm.split(/\s+/).filter((t) => t.length > 3);
      for (const token of tokens) {
        if (label.includes(token)) score += token.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = campaign;
    }
  }

  if (best) return best;

  const hints = KEYWORD_HINTS[storeNorm] ?? [];
  for (const hint of hints) {
    const match = campaigns.find((c) =>
      normalize([c.name, c.description].join(" ")).includes(hint)
    );
    if (match) return match;
  }

  return campaigns[0];
}

export function isYoyoSuccess(data: { responseCode?: string } | null | undefined): boolean {
  return data?.responseCode === "-1";
}
