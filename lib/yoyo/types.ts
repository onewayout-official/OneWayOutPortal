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

export interface YoyoGiftcard {
  id: string;
  balance?: number;
  wiCode?: string;
  stateId?: string;
  campaignId?: number | string;
  userRef?: string;
}

export interface YoyoApiEnvelope {
  responseCode?: string;
  responseDesc?: string;
  giftcardCampaigns?: YoyoGiftcardCampaign[];
  campaigns?: YoyoGiftcardCampaign[];
  giftcard?: YoyoGiftcard;
}

export interface IssueGiftcardBody {
  campaignId: string | number;
  balance: number;
  userRef: string;
  stateId?: string;
  mobileNumber?: string;
  numExpiryDays?: number;
  sendSMS?: boolean;
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
