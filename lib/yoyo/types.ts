export interface YoyoProxyResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  url?: string;
}

export interface YoyoGiftcardCampaign {
  id: number | string;
  name?: string;
  description?: string;
  categoryIds?: string;
  merchantId?: string;
}

/** Yoyo giftcard stateId: A Active, D Deactivated, E Expired, R Redeemed fully */
export type YoyoGiftcardStateId = "A" | "D" | "E" | "R" | string;

export interface YoyoGiftcard {
  id: string;
  /** Remaining balance in cents (decreases on partial redeem). */
  balance?: number;
  wiCode?: string;
  stateId?: YoyoGiftcardStateId;
  campaignId?: number | string;
  userRef?: string;
  /** ISO / Yoyo date string when the gift card expires */
  expiryDate?: string;
  createDate?: string;
  redeemedAmount?: number;
  issuedAmount?: number;
  expiredAmount?: number;
}

export interface YoyoUserToken {
  userRef?: string;
  wiCode?: string;
  wiQR?: string;
  giftcardIds?: Array<string | number>;
  createDate?: string;
  validTillDate?: string;
  lastModifiedDate?: string;
  stateId?: string;
  mobileNumber?: string;
}

export interface YoyoApiEnvelope {
  responseCode?: string;
  responseDesc?: string;
  giftcardCampaigns?: YoyoGiftcardCampaign[];
  campaigns?: YoyoGiftcardCampaign[];
  giftcard?: YoyoGiftcard;
  giftcards?: YoyoGiftcard[];
  token?: YoyoUserToken;
}

export interface CreateUserTokenBody {
  giftcardIds: Array<string | number>;
  mobileNumber?: string;
  /** Required by some CVS environments; ignored for gift-card-only tokens. */
  campaignType?: "COUPON" | "VOUCHER" | "COUPONVOUCHER";
}

export type GiftcardStatusLabel =
  | "Active"
  | "Partially redeemed"
  | "Redeemed"
  | "Expired"
  | "Deactivated"
  | "Unknown";

export interface GiftcardStatusItem {
  id: string;
  stateId?: YoyoGiftcardStateId;
  expiryDate?: string;
  /** Remaining balance in cents from Yoyo (or derived). */
  balance?: number;
  redeemedAmount?: number;
  issuedAmount?: number;
  /** Preferred remaining amount in cents for UI. */
  remainingCents: number;
  isPartiallyRedeemed: boolean;
  statusLabel: GiftcardStatusLabel;
  /** True while the wiCode can still be used (Active or Partially redeemed). */
  isActive: boolean;
}

export interface IssueGiftcardBody {
  campaignId: string | number;
  balance: number;
  userRef: string;
  stateId?: string;
  mobileNumber?: string;
  numExpiryDays?: number;
  sendSMS?: boolean;
  /** Follow-up SMS when the user partially redeems at till. */
  sendFollowUpSMS?: boolean;
}

export interface SpendGiftcardRequest {
  storeId: string;
  storeName: string;
  tabId: string;
  amountRand: number;
  campaignId?: string | number;
  /** Optional SA mobile (277xxxxxxxx). Omitted if invalid — wiCode still returned in API. */
  mobileNumber?: string;
}

export interface SpendGiftcardResponse {
  ok: boolean;
  error?: string;
  responseDesc?: string;
  responseCode?: string;
  giftcard?: YoyoGiftcard;
  pointsBalance?: number;
  pointsRedeemed?: number;
  campaignName?: string;
}

export interface GenerateWiCodeRequest {
  giftcardId: string;
}

export interface GenerateWiCodeResponse {
  ok: boolean;
  error?: string;
  responseDesc?: string;
  responseCode?: string;
  wiCode?: string;
  validTillDate?: string;
  remainingCents?: number;
  giftcard?: YoyoGiftcard;
}
