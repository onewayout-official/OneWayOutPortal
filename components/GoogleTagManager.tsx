"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { GTM_ID, isValidGtmId } from "@/lib/gtm";

export default function GoogleTagManager() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || !isValidGtmId(GTM_ID)) {
    return null;
  }

  const iframeSrc = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_ID)}`;
  const bootstrapScript = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});
  `;

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {bootstrapScript}
      </Script>
      <noscript>
        <iframe
          src={iframeSrc}
          height="0"
          width="0"
          title="Google Tag Manager"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
