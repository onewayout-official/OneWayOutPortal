# Google Tag Manager and Google Analytics 4

The application loads GTM on every route except `/admin` and pushes a
`virtual_page_view` event on initial loads and Next.js client-side navigation.
Only UTM query parameters are included; other query parameters are removed to
avoid sending authentication codes or sensitive portal data.

## Environment configuration

Set the public GTM container ID locally:

```text
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

Add the same variable to each required Vercel environment and redeploy. Next.js
embeds public environment variables at build time.

## GTM configuration

1. In Google Analytics, create or select a GA4 property and Web data stream.
   Copy its measurement ID (`G-...`).
2. In GTM, enable the built-in `Page Path` variable.
3. Create an **Initialization** trigger that fires when `Page Path` does not
   match the regular expression `^/admin(?:/|$)`.
4. Create a **Google tag** with the GA4 measurement ID.
5. Set the Google tag configuration parameter `send_page_view` to `false`.
   Attach the non-admin Initialization trigger.
6. Create these Version 2 **Data Layer Variables**:
   - `DLV - page_location` for `page_location`
   - `DLV - page_path` for `page_path`
   - `DLV - page_title` for `page_title`
7. Create a **Custom Event** trigger for `virtual_page_view`. Add the condition
   `DLV - page_path` does not match `^/admin(?:/|$)`.
8. Create a **Google Analytics: GA4 Event** tag connected to the Google tag:
   - Event name: `page_view`
   - `page_location`: `{{DLV - page_location}}`
   - `page_path`: `{{DLV - page_path}}`
   - `page_title`: `{{DLV - page_title}}`
9. Attach the `virtual_page_view` trigger to the GA4 Event tag.

Disabling automatic pageviews is required. Otherwise, initial page loads can
produce one automatic pageview and one application-generated pageview.

## Verification

1. Start GTM Preview and connect it to the deployed site or local development
   URL.
2. Confirm the Google tag initializes once and one GA4 `page_view` fires for
   each direct load or client-side navigation.
3. Confirm neither tag fires on `/admin` routes.
4. Check GA4 DebugView and Realtime before publishing the GTM container.

Do not add names, email addresses, phone numbers, user-entered account data, or
financial values to the data layer.
