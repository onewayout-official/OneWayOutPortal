import { POINTS_PER_RAND, RETAIL_FOOTPRINT_TABS } from "@/lib/yoyo/retailFootprint";

function SouthAfricaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} aria-hidden>
      <rect width="90" height="30" fill="#DE3831" />
      <rect y="30" width="90" height="30" fill="#002395" />
      <polygon points="0,0 38,20 90,20 90,40 38,40 0,60" fill="#FFFFFF" />
      <polygon points="0,6 36,24 90,24 90,36 36,36 0,54" fill="#007749" />
      <polygon points="0,0 28,24 28,36 0,60" fill="#FFB81C" />
      <polygon points="0,8 22,30 0,52" fill="#000000" />
    </svg>
  );
}

function NamibiaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} aria-hidden>
      <polygon points="0,0 90,0 0,60" fill="#003580" />
      <polygon points="90,0 90,60 0,60" fill="#009543" />
      <line x1="0" y1="60" x2="90" y2="0" stroke="#FFFFFF" strokeWidth="16" />
      <line x1="0" y1="60" x2="90" y2="0" stroke="#D21034" strokeWidth="10" />
      <g fill="#FFD100" transform="translate(18 16)">
        <circle r="5.4" />
        {Array.from({ length: 12 }, (_, index) => (
          <polygon
            key={index}
            points="0,-11.2 1.7,-6.2 -1.7,-6.2"
            transform={`rotate(${index * 30})`}
          />
        ))}
      </g>
    </svg>
  );
}

/** Static snapshot of Spend — no Yoyo or rewards fetches. */
export default function SpendMaintenancePreview() {
  const activeTab = RETAIL_FOOTPRINT_TABS[0];
  const previewStores = activeTab.stores.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-900/30">
            <div className="h-6 w-6 rounded-md bg-rose-500/80" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spend</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Redeem your earned points</p>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="rounded-xl bg-amber-50 p-2.5 ring-2 ring-amber-500 dark:bg-amber-900/30 dark:ring-amber-400">
              <span className="block overflow-hidden rounded-md shadow-sm ring-1 ring-black/10">
                <SouthAfricaFlag className="block h-12 w-[4.5rem]" />
              </span>
            </div>
            <div className="rounded-xl p-2.5">
              <span className="block overflow-hidden rounded-md shadow-sm ring-1 ring-black/10">
                <NamibiaFlag className="block h-12 w-[4.5rem]" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white">
        <p className="text-sm opacity-90">Your points</p>
        <p className="text-3xl font-bold">0</p>
        <p className="mt-1 text-xs opacity-80">Same as Rewards Tracker total · redeem below</p>
        <p className="mt-3 text-sm font-medium opacity-90">Earn more on Earn →</p>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Spend points — Yoyo retail network
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose a store from our April 2026 footprint, enter an amount, then confirm to receive
            one gift card (wiCode).
          </p>
        </div>

        <div className="flex gap-2 overflow-hidden pb-1">
          {RETAIL_FOOTPRINT_TABS.slice(0, 4).map((tab, index) => (
            <span
              key={tab.id}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${
                index === 0
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {tab.label}
            </span>
          ))}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Product-specific vouchers · QR at till where supported · {POINTS_PER_RAND} points = R1
        </p>

        <div className="h-10 rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700" />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {previewStores.map((store) => (
            <div
              key={store.id}
              className="rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700"
            >
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                {store.name}
              </span>
              {store.storeCount != null && (
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {store.storeCount.toLocaleString()} stores
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Spending history</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gift card redemptions will appear here after you spend points.
        </p>
      </div>
    </div>
  );
}
