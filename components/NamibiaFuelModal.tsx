"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { CheckCircle2, Fuel, X } from "lucide-react";

type FuelBrandId = "shell" | "engen" | "puma" | "nasan";

const FUEL_BRANDS: {
  id: FuelBrandId;
  name: string;
  logo: string;
  logoWell: string;
  selected: string;
}[] = [
  {
    id: "shell",
    name: "Shell",
    logo: "/namibia/fuel/shell.png",
    logoWell: "bg-white",
    selected: "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-500 dark:bg-yellow-950/40 dark:border-yellow-400",
  },
  {
    id: "engen",
    name: "Engen",
    logo: "/namibia/fuel/engen.png",
    logoWell: "bg-white",
    selected: "border-blue-600 bg-blue-50 ring-2 ring-blue-600 dark:bg-blue-950/40 dark:border-blue-400",
  },
  {
    id: "puma",
    name: "Puma",
    logo: "/namibia/fuel/puma.png",
    logoWell: "bg-white",
    selected: "border-red-600 bg-red-50 ring-2 ring-red-600 dark:bg-red-950/40 dark:border-red-400",
  },
  {
    id: "nasan",
    name: "Nasan",
    logo: "/namibia/fuel/nasan.svg",
    logoWell: "bg-[#0B1F3A]",
    selected: "border-red-500 bg-red-50 ring-2 ring-red-500 dark:bg-red-950/40 dark:border-red-400",
  },
];

interface NamibiaFuelModalProps {
  registeredEmail: string | null;
  onClose: () => void;
}

export default function NamibiaFuelModal({ registeredEmail, onClose }: NamibiaFuelModalProps) {
  const titleId = useId();
  const amountId = useId();
  const [brand, setBrand] = useState<FuelBrandId | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ brand: FuelBrandId; amount: number } | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const selectedBrand = FUEL_BRANDS.find((item) => item.id === (submitted?.brand ?? brand));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!brand) {
      setError("Select a fuel brand first.");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setError(null);
    setSubmitted({ brand, amount: amountNum });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl"
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <Fuel className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              Fuel
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {submitted ? "Request received." : "Choose a station, then enter the amount."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted && selectedBrand ? (
          <div className="px-5 pb-5 space-y-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Payment request received</p>
                  <p className="text-sm mt-1">
                    Payment instructions will be sent to{" "}
                    <span className="font-medium">
                      {registeredEmail || "your registered email address"}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
            <dl className="text-sm space-y-3">
              <div className="flex justify-between gap-4 items-center">
                <dt className="text-gray-500 dark:text-gray-400">Station</dt>
                <dd className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <img
                    src={selectedBrand.logo}
                    alt=""
                    className={`h-8 w-8 object-contain rounded-md ${selectedBrand.logoWell}`}
                  />
                  {selectedBrand.name}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  N$ {submitted.amount.toFixed(2)}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Station
              </p>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Fuel station">
                {FUEL_BRANDS.map((item) => {
                  const isSelected = brand === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={item.name}
                      onClick={() => {
                        setBrand(item.id);
                        setError(null);
                      }}
                      className={`flex min-h-[5.75rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition-all ${
                        isSelected
                          ? item.selected
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
                      }`}
                    >
                      <span
                        className={`flex h-11 w-full items-center justify-center rounded-lg px-1 shadow-sm ${item.logoWell}`}
                      >
                        <img
                          src={item.logo}
                          alt=""
                          className="max-h-9 max-w-full object-contain"
                        />
                      </span>
                      <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 text-center leading-tight">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {brand && (
              <div>
                <label
                  htmlFor={amountId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Amount (N$)
                </label>
                <input
                  id={amountId}
                  autoFocus
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. 300"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Payment instructions will be sent to{" "}
              {registeredEmail ? (
                <span className="font-medium text-gray-700 dark:text-gray-300">{registeredEmail}</span>
              ) : (
                "your registered email address"
              )}
              .
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!brand}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
