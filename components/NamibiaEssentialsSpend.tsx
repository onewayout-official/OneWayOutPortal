"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Droplets,
  Fuel,
  ShoppingBasket,
  Smartphone,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { NAMIBIA_SPEND_CATEGORIES } from "@/lib/spend/countries";
import { storage } from "@/lib/storage";
import NamibiaAirtimeModal from "@/components/NamibiaAirtimeModal";
import NamibiaGroceriesModal from "@/components/NamibiaGroceriesModal";
import NamibiaFuelModal from "@/components/NamibiaFuelModal";

type UtilityKind = "electricity" | "water";
type EssentialsModal = UtilityKind | "airtime" | "groceries" | "fuel";

const CATEGORY_STYLES: Record<
  (typeof NAMIBIA_SPEND_CATEGORIES)[number]["id"],
  { Icon: LucideIcon; card: string; well: string; label: string }
> = {
  fuel: {
    Icon: Fuel,
    card: "bg-gradient-to-b from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200 hover:border-orange-400 hover:shadow-orange-300/50 dark:from-orange-950 dark:to-orange-900/70 dark:border-orange-700 dark:hover:border-orange-500",
    well: "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-400/40",
    label: "text-orange-900 dark:text-orange-100",
  },
  groceries: {
    Icon: ShoppingBasket,
    card: "bg-gradient-to-b from-emerald-50 to-emerald-100 border-emerald-200 hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-400 hover:shadow-emerald-300/50 dark:from-emerald-950 dark:to-emerald-900/70 dark:border-emerald-700 dark:hover:border-emerald-500",
    well: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-400/40",
    label: "text-emerald-900 dark:text-emerald-100",
  },
  airtime: {
    Icon: Smartphone,
    card: "bg-gradient-to-b from-violet-50 to-violet-100 border-violet-200 hover:from-violet-100 hover:to-violet-200 hover:border-violet-400 hover:shadow-violet-300/50 dark:from-violet-950 dark:to-violet-900/70 dark:border-violet-700 dark:hover:border-violet-500",
    well: "bg-gradient-to-br from-violet-400 to-fuchsia-600 text-white shadow-md shadow-violet-400/40",
    label: "text-violet-900 dark:text-violet-100",
  },
  electricity: {
    Icon: Zap,
    card: "bg-gradient-to-b from-amber-50 to-yellow-100 border-amber-200 hover:from-amber-100 hover:to-yellow-200 hover:border-amber-400 hover:shadow-amber-300/50 dark:from-amber-950 dark:to-amber-900/70 dark:border-amber-700 dark:hover:border-amber-500",
    well: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-400/40",
    label: "text-amber-900 dark:text-amber-100",
  },
  water: {
    Icon: Droplets,
    card: "bg-gradient-to-b from-cyan-50 to-sky-100 border-cyan-200 hover:from-cyan-100 hover:to-sky-200 hover:border-cyan-400 hover:shadow-cyan-300/50 dark:from-cyan-950 dark:to-sky-900/70 dark:border-cyan-700 dark:hover:border-cyan-500",
    well: "bg-gradient-to-br from-cyan-400 to-sky-600 text-white shadow-md shadow-cyan-400/40",
    label: "text-cyan-900 dark:text-cyan-100",
  },
};

const UTILITY_THEME: Record<
  UtilityKind,
  { title: string; Icon: LucideIcon; accent: string; submit: string }
> = {
  electricity: {
    title: "Electricity",
    Icon: Zap,
    accent: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
    submit: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  water: {
    title: "Water",
    Icon: Droplets,
    accent: "bg-gradient-to-br from-cyan-400 to-sky-600 text-white",
    submit: "bg-cyan-600 hover:bg-cyan-700 text-white",
  },
};

function isUtilityKind(id: string): id is UtilityKind {
  return id === "electricity" || id === "water";
}

function isEssentialsModal(id: string): id is EssentialsModal {
  return isUtilityKind(id) || id === "airtime" || id === "groceries" || id === "fuel";
}

interface UtilityPaymentModalProps {
  kind: UtilityKind;
  registeredEmail: string | null;
  onClose: () => void;
}

function UtilityPaymentModal({ kind, registeredEmail, onClose }: UtilityPaymentModalProps) {
  const titleId = useId();
  const meterId = useId();
  const amountId = useId();
  const theme = UTILITY_THEME[kind];
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ meterNumber: string; amount: number } | null>(
    null
  );

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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const meter = meterNumber.trim();
    const amountNum = Number(amount);

    if (meter.length < 4) {
      setError("Enter a valid meter number.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setError(null);
    setSubmitted({ meterNumber: meter, amount: amountNum });
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
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.accent}`}>
            <theme.Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              Pay {theme.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Enter your meter number and amount.
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

        {submitted ? (
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
            <dl className="text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Meter number</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{submitted.meterNumber}</dd>
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
              <label htmlFor={meterId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Meter number
              </label>
              <input
                id={meterId}
                autoFocus
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={meterNumber}
                onChange={(e) => {
                  setMeterNumber(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. 04123456789"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor={amountId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Amount (N$)
              </label>
              <input
                id={amountId}
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. 150"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
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
                className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${theme.submit}`}
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

export default function NamibiaEssentialsSpend() {
  const [openModal, setOpenModal] = useState<EssentialsModal | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [profilePhone, setProfilePhone] = useState("");

  useEffect(() => {
    storage.getProfile().then((profile) => {
      const email = profile?.email?.trim();
      setRegisteredEmail(email || null);
      setProfilePhone(profile?.phone?.trim() ?? "");
    });
  }, []);

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Everyday essentials</h2>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {NAMIBIA_SPEND_CATEGORIES.map((category) => {
          const { Icon, card, well, label } = CATEGORY_STYLES[category.id];
          return (
            <button
              key={category.id}
              type="button"
              title={category.name}
              aria-label={category.name}
              onClick={() => {
                if (isEssentialsModal(category.id)) setOpenModal(category.id);
              }}
              className={`group flex min-w-0 flex-col items-center gap-2.5 rounded-2xl border px-1.5 py-3.5 sm:py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 dark:focus-visible:ring-offset-gray-800 ${card}`}
            >
              <span
                className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${well}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className={`text-[10px] sm:text-xs font-semibold leading-tight text-center ${label}`}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>

      {openModal === "airtime" && (
        <NamibiaAirtimeModal
          registeredEmail={registeredEmail}
          initialMobile={profilePhone}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "groceries" && (
        <NamibiaGroceriesModal
          registeredEmail={registeredEmail}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "fuel" && (
        <NamibiaFuelModal
          registeredEmail={registeredEmail}
          onClose={() => setOpenModal(null)}
        />
      )}
      {(openModal === "electricity" || openModal === "water") && (
        <UtilityPaymentModal
          kind={openModal}
          registeredEmail={registeredEmail}
          onClose={() => setOpenModal(null)}
        />
      )}
    </section>
  );
}
