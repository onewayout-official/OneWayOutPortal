const LOCALHOST_URL = "http://localhost:3000";

function normalizeSiteUrl(url?: string | null): string | null {
  const value = url?.trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeSiteUrl(process.env.VERCEL_URL) ??
    LOCALHOST_URL
  );
}

export function getAppUrl(path = ""): string {
  const baseUrl = getSiteUrl();
  if (!path) return baseUrl;

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}
