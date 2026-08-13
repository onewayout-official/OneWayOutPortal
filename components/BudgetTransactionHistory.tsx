"use client";

import { useEffect, useMemo } from "react";
import { ArrowRight, History, X } from "lucide-react";
import type { BudgetTransaction, BudgetTransactionKind, Expense } from "@/types";

export type HistoryVariant = "income" | "expense";

const INCOME_KINDS = new Set<BudgetTransactionKind>([
  "income_defined",
  "income_to_account",
  "income_allocation_cleared",
]);

const EXPENSE_KINDS = new Set<BudgetTransactionKind>([
  "expense_defined",
  "account_to_expense",
  "expense_allocation_cleared",
  "spend_logged",
]);

const KIND_LABELS: Partial<Record<BudgetTransactionKind, string>> = {
  income_defined: "Added",
  income_to_account: "To account",
  income_allocation_cleared: "Removed",
  expense_defined: "Added",
  account_to_expense: "From account",
  expense_allocation_cleared: "Removed",
  spend_logged: "Spent",
};

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function expenseToSyntheticTx(expense: Expense): BudgetTransaction {
  return {
    id: `expense:${expense.id}`,
    kind: "spend_logged",
    amount: Number(expense.amount) || 0,
    title: expense.title?.trim() || String(expense.category) || "Expense",
    category: String(expense.category),
    expenseId: expense.id,
    fromAccountId: expense.accountId,
    metadata: { date: expense.date, synthetic: true },
    createdAt: expense.date.includes("T")
      ? expense.date
      : `${expense.date}T12:00:00.000Z`,
  };
}

function mergeExpenseHistoryRows(
  ledger: BudgetTransaction[],
  expenses: Expense[]
): BudgetTransaction[] {
  const ledgerExpenseIds = new Set(
    ledger
      .filter((t) => t.kind === "spend_logged" && t.expenseId)
      .map((t) => t.expenseId as string)
  );

  const synthetic = expenses
    .filter((e) => !ledgerExpenseIds.has(e.id))
    .map(expenseToSyntheticTx);

  return [...ledger, ...synthetic]
    .filter((t) => EXPENSE_KINDS.has(t.kind))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function metaString(tx: BudgetTransaction, key: string): string | undefined {
  const v = tx.metadata?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Parse legacy titles like "Groceries ← FNB" into account → expense. */
function parseExpenseAccountFlow(title: string): { from: string; to: string } | null {
  if (title.includes(" ← ")) {
    const [expense, account] = title.split(" ← ");
    if (account?.trim() && expense?.trim()) {
      return { from: account.trim(), to: expense.trim() };
    }
  }
  if (title.includes(" → ")) {
    const [from, to] = title.split(" → ");
    if (from?.trim() && to?.trim()) {
      return { from: from.trim(), to: to.trim() };
    }
  }
  return null;
}

function KindChip({
  label,
  variant,
}: {
  label: string;
  variant: HistoryVariant;
}) {
  const isIncome = variant === "income";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isIncome
          ? "bg-[#2f6064]/10 text-[#2f6064] dark:text-[#7bb9bd]"
          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
      }`}
    >
      {label}
    </span>
  );
}

function ExpenseFlowLabel({
  from,
  to,
  chipLabel,
}: {
  from: string;
  to: string;
  chipLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-snug">
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-gray-700 dark:text-gray-300">{from}</span>
        {chipLabel && <KindChip label={chipLabel} variant="expense" />}
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
      <span className="font-semibold text-gray-900 dark:text-white">{to}</span>
    </div>
  );
}

function IncomeFlowLabel({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-snug">
      <span className="font-medium text-gray-700 dark:text-gray-300">{from}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#2f6064]/70" aria-hidden />
      <span className="font-semibold text-gray-900 dark:text-white">{to}</span>
    </div>
  );
}

function HistoryRowLabel({
  tx,
  variant,
  flowChipLabel,
}: {
  tx: BudgetTransaction;
  variant: HistoryVariant;
  flowChipLabel?: string;
}) {
  if (variant === "expense") {
    if (tx.kind === "account_to_expense" || tx.kind === "expense_allocation_cleared") {
      const accountName = metaString(tx, "account_name");
      const expenseLabel = metaString(tx, "expense_label") ?? tx.category;
      const parsed = parseExpenseAccountFlow(tx.title);
      const from = accountName ?? parsed?.from;
      const to = expenseLabel ?? parsed?.to;
      if (from && to) {
        return <ExpenseFlowLabel from={from} to={to} chipLabel={flowChipLabel} />;
      }
    }
    return (
      <p className="font-semibold text-gray-900 dark:text-white">
        {metaString(tx, "expense_label") ?? tx.title}
      </p>
    );
  }

  if (tx.kind === "income_to_account" || tx.kind === "income_allocation_cleared") {
    const incomeLabel = metaString(tx, "income_label") ?? tx.category;
    const accountName = metaString(tx, "account_name");
    const parsed = tx.title.includes(" → ")
      ? (() => {
          const [from, to] = tx.title.split(" → ");
          return from?.trim() && to?.trim() ? { from: from.trim(), to: to.trim() } : null;
        })()
      : null;
    const from = incomeLabel ?? parsed?.from;
    const to = accountName ?? parsed?.to;
    if (from && to) {
      return <IncomeFlowLabel from={from} to={to} />;
    }
  }

  return <p className="font-semibold text-gray-900 dark:text-white">{tx.title}</p>;
}

export function getIncomeHistoryRows(transactions: BudgetTransaction[]): BudgetTransaction[] {
  return transactions
    .filter((t) => INCOME_KINDS.has(t.kind))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getExpenseHistoryRows(
  transactions: BudgetTransaction[],
  expenses: Expense[]
): BudgetTransaction[] {
  return mergeExpenseHistoryRows(transactions, expenses);
}

export default function BudgetTransactionHistoryModal({
  open,
  onClose,
  variant,
  transactions,
  expenses = [],
}: {
  open: boolean;
  onClose: () => void;
  variant: HistoryVariant;
  transactions: BudgetTransaction[];
  expenses?: Expense[];
}) {
  const rows = useMemo(() => {
    if (variant === "income") return getIncomeHistoryRows(transactions);
    return getExpenseHistoryRows(transactions, expenses);
  }, [variant, transactions, expenses]);

  const isIncome = variant === "income";
  const title = isIncome ? "Income history" : "Expense history";
  const emptyMessage = isIncome
    ? "No income activity yet. Adding income or transferring to accounts will appear here."
    : "No expense activity yet. Budget allocations and logged spend will appear here.";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:max-h-[min(32rem,85vh)] sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-history-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h2
              id="budget-history-title"
              className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white"
            >
              <History className={`h-5 w-5 shrink-0 ${isIncome ? "text-[#2f6064]" : "text-orange-600"}`} />
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {rows.length} {rows.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Close history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          {rows.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((tx) => {
                const incomeTone = isIncome && INCOME_KINDS.has(tx.kind);
                const expenseTone = !isIncome && EXPENSE_KINDS.has(tx.kind);
                const amountClass = expenseTone
                  ? "text-orange-600 dark:text-orange-400"
                  : incomeTone
                    ? "text-[#2f6064]"
                    : "text-gray-700 dark:text-gray-200";
                const prefix = expenseTone ? "−" : incomeTone ? "+" : "";
                const kindLabel = KIND_LABELS[tx.kind];
                const chipBesideAccount =
                  !isIncome &&
                  (tx.kind === "account_to_expense" || tx.kind === "expense_allocation_cleared");

                return (
                  <li
                    key={tx.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-2 last:pb-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={
                          chipBesideAccount ? undefined : "flex flex-wrap items-center gap-2"
                        }
                      >
                        <HistoryRowLabel
                          tx={tx}
                          variant={variant}
                          flowChipLabel={chipBesideAccount ? kindLabel : undefined}
                        />
                        {!chipBesideAccount && kindLabel && (
                          <KindChip label={kindLabel} variant={variant} />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(tx.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {tx.category &&
                        !(
                          tx.kind === "account_to_expense" ||
                          tx.kind === "expense_allocation_cleared"
                        )
                          ? ` · ${tx.category}`
                          : ""}
                      </p>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold tabular-nums ${amountClass}`}>
                      {prefix}R {formatMoney(tx.amount)}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <History className={`mb-3 h-10 w-10 ${isIncome ? "text-[#2f6064]/30" : "text-orange-300"}`} />
              <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
