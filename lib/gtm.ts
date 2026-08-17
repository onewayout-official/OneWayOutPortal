export type GtmEvent = {
  event: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer: GtmEvent[];
  }
}

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

export function isValidGtmId(gtmId: string | undefined): gtmId is string {
  return Boolean(gtmId && /^GTM-[A-Z0-9]+$/i.test(gtmId));
}

export function pushToDataLayer(data: GtmEvent): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}
