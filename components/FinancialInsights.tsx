"use client";

export default function FinancialInsights() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No Financial Plan Yet</h2>
      <button
        onClick={(e) => e.preventDefault()}
        className="px-6 py-3 bg-[#2f6064] hover:bg-[#254e52] text-white font-semibold rounded-xl transition-colors"
      >
        Start Financial Plan
      </button>
    </div>
  );
}
