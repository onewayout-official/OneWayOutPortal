"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { CheckCircle2, Smartphone, X } from "lucide-react";

type AirtimeOperator = "mtc" | "tn-mobile";

const OPERATORS: {
  id: AirtimeOperator;
  name: string;
  hint: string;
  ring: string;
  selected: string;
}[] = [
  {
    id: "mtc",
    name: "MTC",
    hint: "081",
    ring: "focus-visible:ring-red-500",
    selected: "border-red-500 bg-red-50 ring-2 ring-red-500 dark:bg-red-950/40 dark:border-red-400",
  },
  {
    id: "tn-mobile",
    name: "TN Mobile",
    hint: "085",
    ring: "focus-visible:ring-lime-500",
    selected: "border-lime-500 bg-lime-50 ring-2 ring-lime-500 dark:bg-lime-950/40 dark:border-lime-400",
  },
];

function MtcLogo() {
  return (
    <span className="inline-flex h-10 min-w-[5.75rem] items-center justify-center rounded-lg bg-[#E30613] px-3">
      <span className="text-[17px] font-black tracking-[0.22em] text-white leading-none">MTC</span>
    </span>
  );
}

function TnMobileLogo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#8DC63F]">
        <span className="text-[15px] font-black lowercase leading-none text-[#163D28]">tn</span>
      </span>
      <span className="text-sm font-bold text-[#1A6B5A] dark:text-lime-200">Mobile</span>
    </span>
  );
}

function OperatorLogo({ operator }: { operator: AirtimeOperator }) {
  return operator === "mtc" ? <MtcLogo /> : <TnMobileLogo />;
}

function isValidNamibiaMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("264")) return digits.length >= 11 && digits.length <= 12;
  if (digits.startsWith("0")) return digits.length === 10;
  return digits.length >= 8 && digits.length <= 12;
}

interface NamibiaAirtimeModalProps {
  registeredEmail: string | null;
  initialMobile?: string;
  onClose: () => void;
}

export default function NamibiaAirtimeModal({
  registeredEmail,
  initialMobile = "",
  onClose,
}: NamibiaAirtimeModalProps) {
  const titleId = useId();
  const mobileId = useId();
  const amountId = useId();
  const [operator, setOperator] = useState<AirtimeOperator | null>(null);
  const [mobileNumber, setMobileNumber] = useState(initialMobile);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    operator: AirtimeOperator;
    mobileNumber: string;
    amount: number;
  } | null>(null);

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
    if (!operator) {
      setError("Select MTC or TN Mobile first.");
      return;
    }
    const mobile = mobileNumber.trim();
    const amountNum = Number(amount);
    if (!isValidNamibiaMobile(mobile)) {
      setError("Enter a valid Namibian mobile number.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setError(null);
    setSubmitted({ operator, mobileNumber: mobile, amount: amountNum });
  };

  const selectedName = submitted
    ? OPERATORS.find((item) => item.id === submitted.operator)?.name
    : null;

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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-600 text-white">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              Buy airtime
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {submitted ? "Request received." : "Choose a network, then enter the number and amount."}
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

        {submitted && selectedName ? (
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
              <div className="flex justify-between gap-4 items-center">
                <dt className="text-gray-500 dark:text-gray-400">Network</dt>
                <dd className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <OperatorLogo operator={submitted.operator} />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Mobile number</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{submitted.mobileNumber}</dd>
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
                Network
              </p>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Airtime network">
                {OPERATORS.map((item) => {
                  const isSelected = operator === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setOperator(item.id);
                        setError(null);
                      }}
                      className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 transition-all ${
                        isSelected
                          ? item.selected
                          : `border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500 ${item.ring}`
                      }`}
                    >
                      <OperatorLogo operator={item.id} />
                      <span className="sr-only">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {operator && (
              <>
                <div>
                  <label
                    htmlFor={mobileId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Mobile number
                  </label>
                  <input
                    id={mobileId}
                    autoFocus
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      setError(null);
                    }}
                    placeholder={operator === "mtc" ? "e.g. 081 123 4567" : "e.g. 085 123 4567"}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor={amountId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                  >
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
                    placeholder="e.g. 50"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </>
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
                disabled={!operator}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
