"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Target, X, Plus, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  calcDeath,
  calcDebt,
  calcDisability,
  calcRetirement,
  calcSevereIllness,
  calcStudy,
  DEBT_CATCHUP_STEPS,
  DEBT_TYPE_OPTIONS,
  formatRand,
  validateFinancialGoalsForSummary,
  type DebtRow,
  type DebtStrategy,
  type ResultRow,
  type ShortfallEntry,
  type ShortfallKey,
  type StudyRow,
} from "@/lib/financialGoalsCalc";

const SECTION_TAB: Record<ShortfallKey, TabId> = {
  retire: "g-retire",
  death: "g-death",
  study: "g-study",
  debt: "g-debt",
  dis: "g-dis",
  ci: "g-ci",
};

type TabId =
  | "g-retire"
  | "g-death"
  | "g-study"
  | "g-debt"
  | "g-dis"
  | "g-ci"
  | "g-summary";

const TABS: { id: TabId; label: string; shortfallKey?: ShortfallKey }[] = [
  { id: "g-retire", label: "Retirement", shortfallKey: "retire" },
  { id: "g-death", label: "Death", shortfallKey: "death" },
  { id: "g-study", label: "Study", shortfallKey: "study" },
  { id: "g-debt", label: "Debt Repayment", shortfallKey: "debt" },
  { id: "g-dis", label: "Disability", shortfallKey: "dis" },
  { id: "g-ci", label: "Severe Illness", shortfallKey: "ci" },
  { id: "g-summary", label: "Summary" },
];

function newId(): string {
  return crypto.randomUUID();
}

function storageKey(userId: string): string {
  return `onewayout-financial-goals:v2:${userId}`;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#2f6064] focus:outline-none focus:ring-2 focus:ring-[#2f6064]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

const labelCls =
  "block text-xs font-semibold leading-snug text-gray-900 dark:text-gray-100 min-h-[3rem]";

const hintCls = "mt-1.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400";

const formGridCls = "grid grid-cols-1 items-start gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3";

const formGrid2Cls = "grid grid-cols-1 items-start gap-x-5 gap-y-6 sm:grid-cols-2";

const formGridWideCls = "grid grid-cols-1 items-start gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4";

const summaryGridCls = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className={hintCls}>{children}</p>;
}

function NumField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        className={inputCls}
        value={Number.isFinite(value) && value !== 0 ? value : ""}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
      />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}

function SelectField({
  label,
  hint,
  value,
  onChange,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}

function ResultsPanel({
  title,
  rows,
  notes,
  emptyNote,
}: {
  title: string;
  rows: ResultRow[];
  notes: string[];
  emptyNote?: string;
}) {
  if (emptyNote && !rows.length) {
    return (
      <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/30">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2f6064] dark:text-teal-300">{title}</h3>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{emptyNote}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/30">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#2f6064] dark:text-teal-300">
        {title}
      </h3>
      <div className="space-y-0">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex justify-between gap-3 border-b border-dashed border-teal-200/80 py-1.5 text-sm last:border-0 dark:border-teal-800"
          >
            <span className={row.strong ? "font-semibold" : ""}>{row.label}</span>
            <span
              className={`whitespace-nowrap font-semibold ${
                row.valueClass === "neg"
                  ? "text-red-600 dark:text-red-400"
                  : row.valueClass === "pos"
                    ? "text-green-600 dark:text-green-400"
                    : row.valueClass === "warn"
                      ? "text-amber-600 dark:text-amber-400"
                      : ""
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {notes.map((note, i) => (
        <p key={i} className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          {note.includes("roughly") ? (
            <>
              {note.split(/(R [\d,]+)/).map((part, j) =>
                /^R [\d,]+/.test(part) ? (
                  <strong key={j} className="text-gray-800 dark:text-gray-200">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </>
          ) : (
            note
          )}
        </p>
      ))}
    </div>
  );
}

export type FinancialGoalsPersisted = {
  retire: {
    age: number;
    retAge: number;
    income: number;
    pct: number;
    saved: number;
    pm: number;
    growth: number;
    infl: number;
    years: number;
    postGrowth: number;
  };
  death: {
    incNeed: number;
    years: number;
    debt: number;
    edu: number;
    funeral: number;
    estate: number;
    cover: number;
    assets: number;
    growth: number;
    infl: number;
  };
  study: { rows: StudyRow[]; saved: number; pm: number; infl: number; growth: number };
  debt: { rows: DebtRow[]; budget: number; strategy: DebtStrategy };
  dis: {
    age: number;
    retAge: number;
    incNeed: number;
    debt: number;
    adjust: number;
    cover: number;
    growth: number;
    infl: number;
  };
  ci: { med: number; exp: number; months: number; debt: number; care: number; cover: number };
};

function defaultState(): FinancialGoalsPersisted {
  return {
    retire: {
      age: 0,
      retAge: 0,
      income: 0,
      pct: 0,
      saved: 0,
      pm: 0,
      growth: 0,
      infl: 0,
      years: 0,
      postGrowth: 0,
    },
    death: {
      incNeed: 0,
      years: 0,
      debt: 0,
      edu: 0,
      funeral: 0,
      estate: 0,
      cover: 0,
      assets: 0,
      growth: 0,
      infl: 0,
    },
    study: {
      rows: [],
      saved: 0,
      pm: 0,
      infl: 0,
      growth: 0,
    },
    debt: {
      rows: [],
      budget: 0,
      strategy: "avalanche",
    },
    dis: {
      age: 0,
      retAge: 0,
      incNeed: 0,
      debt: 0,
      adjust: 0,
      cover: 0,
      growth: 0,
      infl: 0,
    },
    ci: { med: 0, exp: 0, months: 0, debt: 0, care: 0, cover: 0 },
  };
}

export default function FinancialGoals() {
  const { user } = useAuth();
  const userId = user?.userId ?? "anonymous";

  const [activeTab, setActiveTab] = useState<TabId>("g-retire");
  const [data, setData] = useState<FinancialGoalsPersisted>(() => defaultState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as FinancialGoalsPersisted;
        setData(parsed);
      }
    } catch {
      // ignore corrupt cache
    }
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(data));
    } catch {
      // quota etc.
    }
  }, [data, hydrated, userId]);

  const patch = useCallback(<K extends keyof FinancialGoalsPersisted>(
    key: K,
    updater: (prev: FinancialGoalsPersisted[K]) => FinancialGoalsPersisted[K]
  ) => {
    setData((d) => ({ ...d, [key]: updater(d[key]) }));
  }, []);

  const retireOut = useMemo(() => calcRetirement(data.retire), [data.retire]);
  const deathOut = useMemo(() => calcDeath(data.death), [data.death]);
  const studyOut = useMemo(() => calcStudy(data.study), [data.study]);
  const debtOut = useMemo(() => calcDebt(data.debt), [data.debt]);
  const disOut = useMemo(() => calcDisability(data.dis), [data.dis]);
  const ciOut = useMemo(() => calcSevereIllness(data.ci), [data.ci]);

  const shortfalls: Partial<Record<ShortfallKey, ShortfallEntry>> = useMemo(
    () => ({
      retire: retireOut.shortfall,
      death: deathOut.shortfall,
      study: studyOut?.shortfall ?? { label: "Study / Education", gap: 0, unit: "education funding", detail: "Add a child to begin" },
      debt: debtOut.shortfall,
      dis: disOut.shortfall,
      ci: ciOut.shortfall,
    }),
    [retireOut, deathOut, studyOut, debtOut, disOut, ciOut]
  );

  const summaryValidation = useMemo(() => validateFinancialGoalsForSummary(data), [data]);

  const summaryOrder: ShortfallKey[] = ["retire", "death", "study", "debt", "dis", "ci"];

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cardCls =
    "rounded-xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-800";

  const tableWrapCls =
    "overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600";

  const tableInputCls =
    "w-full min-w-[4.5rem] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-teal-100 p-3 dark:bg-teal-900/40">
          <Target className="h-6 w-6 text-[#2f6064] dark:text-teal-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Goals</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Fill in every field on each goal tab (assumptions are optional). When all sections are complete, open
            Summary for your full picture. All amounts are in South African Rand (R). Your answers are stored only
            in your browser on this device.
          </p>
        </div>
      </div>

      <nav className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50/95 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95">
        {TABS.map((t) => {
          const isSummary = t.id === "g-summary";
          const key = t.shortfallKey;
          const sectionComplete = key ? summaryValidation.sections[key]?.complete : summaryValidation.ok;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                active
                  ? "border-[#2f6064] bg-[#2f6064] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#2f6064]/50 hover:text-[#2f6064] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              } ${isSummary && !summaryValidation.ok ? "opacity-90" : ""}`}
            >
              {!isSummary && key && (
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    sectionComplete ? "bg-green-500" : "bg-amber-400"
                  }`}
                  title={sectionComplete ? "Section complete" : "Required fields missing"}
                />
              )}
              {isSummary && <Star className="h-3.5 w-3.5" aria-hidden />}
              {t.label === "Summary" ? "★ Summary" : t.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "g-retire" && (
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">1. Retirement</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Will your savings give you the income you want when you stop working?
          </p>
          <div className={formGridCls}>
            <NumField label="Your current age" value={data.retire.age} min={16} max={80} onChange={(n) => patch("retire", (r) => ({ ...r, age: n }))} />
            <NumField label="Age you want to retire" value={data.retire.retAge} min={40} max={80} onChange={(n) => patch("retire", (r) => ({ ...r, retAge: n }))} />
            <NumField
              label="Your current monthly income (before tax)"
              hint="Your gross salary or earnings per month"
              value={data.retire.income}
              min={0}
              onChange={(n) => patch("retire", (r) => ({ ...r, income: n }))}
            />
            <NumField
              label="% of income you'll need in retirement"
              hint="Most people need 70–80% of their salary"
              value={data.retire.pct}
              min={10}
              max={120}
              onChange={(n) => patch("retire", (r) => ({ ...r, pct: n }))}
            />
            <NumField
              label="Retirement savings you already have"
              hint="Pension, provident, RA and preservation funds"
              value={data.retire.saved}
              min={0}
              onChange={(n) => patch("retire", (r) => ({ ...r, saved: n }))}
            />
            <NumField
              label="Amount you save for retirement each month"
              value={data.retire.pm}
              min={0}
              onChange={(n) => patch("retire", (r) => ({ ...r, pm: n }))}
            />
          </div>
          <details className="mt-6 rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <summary className="cursor-pointer text-sm font-semibold text-[#2f6064] dark:text-teal-300">
              Assumptions (optional)
            </summary>
            <div className={`mt-4 ${formGridWideCls}`}>
              <NumField label="Investment growth per year (%)" value={data.retire.growth} step={0.5} onChange={(n) => patch("retire", (r) => ({ ...r, growth: n }))} />
              <NumField label="Inflation per year (%)" value={data.retire.infl} step={0.5} onChange={(n) => patch("retire", (r) => ({ ...r, infl: n }))} />
              <NumField label="Years your money must last in retirement" value={data.retire.years} min={5} max={45} onChange={(n) => patch("retire", (r) => ({ ...r, years: n }))} />
              <NumField label="Growth after retirement (%)" value={data.retire.postGrowth} step={0.5} onChange={(n) => patch("retire", (r) => ({ ...r, postGrowth: n }))} />
            </div>
          </details>
          <ResultsPanel title="Your retirement picture" rows={retireOut.rows} notes={retireOut.notes} />
        </div>
      )}

      {activeTab === "g-death" && (
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">2. Death — providing for your family</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            How much life cover would your family need if you passed away today?
          </p>
          <div className={formGridCls}>
            <NumField label="Monthly income your family would need" hint="What your dependants need to live on each month" value={data.death.incNeed} min={0} onChange={(n) => patch("death", (d) => ({ ...d, incNeed: n }))} />
            <NumField label="For how many years?" hint="e.g. until your youngest child is independent" value={data.death.years} min={1} max={60} onChange={(n) => patch("death", (d) => ({ ...d, years: n }))} />
            <NumField label="Debts to be settled at death" hint="Bond, car finance, loans, credit cards" value={data.death.debt} min={0} onChange={(n) => patch("death", (d) => ({ ...d, debt: n }))} />
            <NumField label="Education amount to set aside" hint="Lump sum for children's schooling/studies" value={data.death.edu} min={0} onChange={(n) => patch("death", (d) => ({ ...d, edu: n }))} />
            <NumField label="Funeral & immediate costs" value={data.death.funeral} min={0} onChange={(n) => patch("death", (d) => ({ ...d, funeral: n }))} />
            <NumField label="Estimated value of your estate" hint="Used to estimate executor's fees & estate costs" value={data.death.estate} min={0} onChange={(n) => patch("death", (d) => ({ ...d, estate: n }))} />
            <NumField label="Life cover you already have" hint="Personal policies + group life at work" value={data.death.cover} min={0} onChange={(n) => patch("death", (d) => ({ ...d, cover: n }))} />
            <NumField label="Savings/investments available to your family" value={data.death.assets} min={0} onChange={(n) => patch("death", (d) => ({ ...d, assets: n }))} />
          </div>
          <details className="mt-6 rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <summary className="cursor-pointer text-sm font-semibold text-[#2f6064] dark:text-teal-300">Adjust assumptions (optional)</summary>
            <div className={`mt-4 ${formGrid2Cls}`}>
              <NumField label="Investment growth on the capital (%)" value={data.death.growth} step={0.5} onChange={(n) => patch("death", (d) => ({ ...d, growth: n }))} />
              <NumField label="Inflation per year (%)" value={data.death.infl} step={0.5} onChange={(n) => patch("death", (d) => ({ ...d, infl: n }))} />
            </div>
          </details>
          <ResultsPanel title="Life cover needed" rows={deathOut.rows} notes={deathOut.notes} />
        </div>
      )}

      {activeTab === "g-study" && (
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">3. Study / Education</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Plan for each child&apos;s education. Add a row per child (or per study goal).
          </p>
          <div className={tableWrapCls}>
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Child / goal</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Years until studies start</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Length (years)</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Cost per year today (R)</th>
                  <th className="w-10 bg-gray-100 px-2 py-2.5 dark:bg-gray-700/50" aria-label="Remove row" />
                </tr>
              </thead>
              <tbody>
                {data.study.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No children added yet. Use &quot;Add a child&quot; below to start planning.
                    </td>
                  </tr>
                ) : (
                  data.study.rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-2 align-top">
                      <input
                        className={tableInputCls}
                        placeholder="Name"
                        value={row.name}
                        onChange={(e) =>
                          patch("study", (s) => ({
                            ...s,
                            rows: s.rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        className={tableInputCls}
                        min={0}
                        max={30}
                        value={row.start || ""}
                        onChange={(e) =>
                          patch("study", (s) => ({
                            ...s,
                            rows: s.rows.map((r) => (r.id === row.id ? { ...r, start: parseFloat(e.target.value) || 0 } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        className={tableInputCls}
                        min={1}
                        max={10}
                        value={row.len || ""}
                        onChange={(e) =>
                          patch("study", (s) => ({
                            ...s,
                            rows: s.rows.map((r) => (r.id === row.id ? { ...r, len: parseFloat(e.target.value) || 0 } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        className={tableInputCls}
                        min={0}
                        value={row.cost || ""}
                        onChange={(e) =>
                          patch("study", (s) => ({
                            ...s,
                            rows: s.rows.map((r) => (r.id === row.id ? { ...r, cost: parseFloat(e.target.value) || 0 } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Remove"
                        onClick={() =>
                          patch("study", (s) => ({ ...s, rows: s.rows.filter((r) => r.id !== row.id) }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#2f6064] px-4 py-2 text-sm font-medium text-[#2f6064] hover:bg-teal-50 dark:border-teal-600 dark:text-teal-300 dark:hover:bg-teal-950/40"
            onClick={() =>
              patch("study", (s) => ({
                ...s,
                rows: [
                  ...s.rows,
                  { id: newId(), name: "", start: 0, len: 0, cost: 0 },
                ],
              }))
            }
          >
            <Plus className="h-4 w-4" /> Add a child
          </button>
          <div className={`mt-4 ${formGrid2Cls}`}>
            <NumField label="Education savings you already have" value={data.study.saved} min={0} onChange={(n) => patch("study", (s) => ({ ...s, saved: n }))} />
            <NumField label="Amount you save for education each month" value={data.study.pm} min={0} onChange={(n) => patch("study", (s) => ({ ...s, pm: n }))} />
          </div>
          <details className="mt-6 rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <summary className="cursor-pointer text-sm font-semibold text-[#2f6064] dark:text-teal-300">Adjust assumptions (optional)</summary>
            <div className={`mt-4 ${formGrid2Cls}`}>
              <NumField label="Education inflation per year (%)" hint="Education costs rise faster than normal inflation" value={data.study.infl} step={0.5} onChange={(n) => patch("study", (s) => ({ ...s, infl: n }))} />
              <NumField label="Investment growth per year (%)" value={data.study.growth} step={0.5} onChange={(n) => patch("study", (s) => ({ ...s, growth: n }))} />
            </div>
          </details>
          <ResultsPanel
            title="Education funding"
            rows={studyOut?.rows ?? []}
            notes={studyOut?.notes ?? []}
            emptyNote="Add a child above to begin."
          />
        </div>
      )}

      {activeTab === "g-debt" && (
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">4. Debt Repayment — catching up arrears</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            List every account that is behind (in arrears). We&apos;ll build a plan to bring each one up to date.
          </p>
          <div className={tableWrapCls}>
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Creditor</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Type</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Amount in arrears (R)</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Months behind</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Interest rate %</th>
                  <th className="whitespace-nowrap bg-gray-100 px-3 py-2.5 font-semibold dark:bg-gray-700/50">Normal monthly instalment (R)</th>
                  <th className="w-10 bg-gray-100 px-2 py-2.5 dark:bg-gray-700/50" aria-label="Remove row" />
                </tr>
              </thead>
              <tbody>
                {data.debt.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No arrear accounts listed. Use &quot;Add a debt&quot; if you need a catch-up plan.
                    </td>
                  </tr>
                ) : (
                  data.debt.rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-2 align-top">
                      <input
                        className={tableInputCls}
                        placeholder="e.g. ABSA card"
                        value={row.cred}
                        onChange={(e) =>
                          patch("debt", (d) => ({
                            ...d,
                            rows: d.rows.map((r) => (r.id === row.id ? { ...r, cred: e.target.value } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <select
                        className={tableInputCls}
                        value={row.type}
                        onChange={(e) =>
                          patch("debt", (d) => ({
                            ...d,
                            rows: d.rows.map((r) =>
                              r.id === row.id ? { ...r, type: e.target.value as DebtRow["type"] } : r
                            ),
                          }))
                        }
                      >
                        {DEBT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        className={tableInputCls}
                        min={0}
                        value={row.arr || ""}
                        onChange={(e) =>
                          patch("debt", (d) => ({
                            ...d,
                            rows: d.rows.map((r) => (r.id === row.id ? { ...r, arr: parseFloat(e.target.value) || 0 } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        className={tableInputCls}
                        min={0}
                        value={row.mths || ""}
                        onChange={(e) =>
                          patch("debt", (d) => ({
                            ...d,
                            rows: d.rows.map((r) => (r.id === row.id ? { ...r, mths: parseFloat(e.target.value) || 0 } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        className={tableInputCls}
                        min={0}
                        step={0.5}
                        value={row.rate || ""}
                        onChange={(e) =>
                          patch("debt", (d) => ({
                            ...d,
                            rows: d.rows.map((r) => (r.id === row.id ? { ...r, rate: parseFloat(e.target.value) || 0 } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        className={tableInputCls}
                        min={0}
                        value={row.inst || ""}
                        onChange={(e) =>
                          patch("debt", (d) => ({
                            ...d,
                            rows: d.rows.map((r) => (r.id === row.id ? { ...r, inst: parseFloat(e.target.value) || 0 } : r)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Remove"
                        onClick={() =>
                          patch("debt", (d) => ({ ...d, rows: d.rows.filter((r) => r.id !== row.id) }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#2f6064] px-4 py-2 text-sm font-medium text-[#2f6064] hover:bg-teal-50 dark:border-teal-600 dark:text-teal-300 dark:hover:bg-teal-950/40"
            onClick={() =>
              patch("debt", (d) => ({
                ...d,
                rows: [
                  ...d.rows,
                  {
                    id: newId(),
                    cred: "",
                    type: "Credit card",
                    arr: 0,
                    mths: 0,
                    rate: 0,
                    inst: 0,
                  },
                ],
              }))
            }
          >
            <Plus className="h-4 w-4" /> Add a debt
          </button>
          <div className={`mt-4 ${formGrid2Cls}`}>
            <NumField
              label="Extra amount you can pay per month"
              hint="Over and above your normal instalments — this is what catches up the arrears"
              value={data.debt.budget}
              min={0}
              onChange={(n) => patch("debt", (d) => ({ ...d, budget: n }))}
            />
            <SelectField
              label="Catch-up strategy"
              hint="Highest interest first saves the most money; smallest arrears first gives quick wins"
              value={data.debt.strategy}
              onChange={(v) => patch("debt", (d) => ({ ...d, strategy: v as DebtStrategy }))}
            >
              <option value="avalanche">Highest interest rate first</option>
              <option value="snowball">Smallest arrears first</option>
              <option value="oldest">Most months behind first</option>
            </SelectField>
          </div>
          <ResultsPanel
            title="Arrears catch-up plan"
            rows={debtOut.rows}
            notes={debtOut.notes}
            emptyNote={!debtOut.rows.length ? debtOut.notes[0] : undefined}
          />
          {debtOut.schedule.length > 0 && (
            <div className={`mt-4 ${tableWrapCls}`}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-gray-500">
                    <th className="bg-gray-100 p-2 dark:bg-gray-700/50">#</th>
                    <th className="bg-gray-100 p-2 dark:bg-gray-700/50">Creditor</th>
                    <th className="bg-gray-100 p-2 dark:bg-gray-700/50">Arrears</th>
                    <th className="bg-gray-100 p-2 dark:bg-gray-700/50">Starts in month</th>
                    <th className="bg-gray-100 p-2 dark:bg-gray-700/50">Paid up by month</th>
                  </tr>
                </thead>
                <tbody>
                  {debtOut.schedule.map((s) => (
                    <tr key={s.order} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="p-2">{s.order}</td>
                      <td className="p-2">
                        {s.cred}{" "}
                        <span className="text-xs text-gray-500">{s.type}</span>
                      </td>
                      <td className="p-2">{formatRand(s.arr)}</td>
                      <td className="p-2">{s.startMonth}</td>
                      <td className="p-2 font-semibold">{s.endMonth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.debt.rows.some((r) => r.arr > 0) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2f6064] dark:text-teal-300">
                How to get each account up to date
              </h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
                {DEBT_CATCHUP_STEPS.map((step, i) => (
                  <li key={i}>
                    <strong>{step.title}</strong> {step.body}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {activeTab === "g-dis" && (
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">5. Disability</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            If illness or injury stopped you from earning, how would you replace your income?
          </p>
          <div className={formGridCls}>
            <NumField label="Your current age" value={data.dis.age} min={16} max={70} onChange={(n) => patch("dis", (d) => ({ ...d, age: n }))} />
            <NumField label="Planned retirement age" hint="Cover usually needs to last until you'd have retired" value={data.dis.retAge} min={40} max={75} onChange={(n) => patch("dis", (d) => ({ ...d, retAge: n }))} />
            <NumField label="Monthly income to replace" hint="What you'd need per month if you couldn't work" value={data.dis.incNeed} min={0} onChange={(n) => patch("dis", (d) => ({ ...d, incNeed: n }))} />
            <NumField label="Debts you'd want settled" hint="Removing debt reduces the income you need" value={data.dis.debt} min={0} onChange={(n) => patch("dis", (d) => ({ ...d, debt: n }))} />
            <NumField label="Once-off adjustment costs" hint="Home/vehicle modifications, medical equipment, rehab" value={data.dis.adjust} min={0} onChange={(n) => patch("dis", (d) => ({ ...d, adjust: n }))} />
            <NumField label="Disability cover you already have" hint="Lump-sum disability + capitalised income protection" value={data.dis.cover} min={0} onChange={(n) => patch("dis", (d) => ({ ...d, cover: n }))} />
          </div>
          <details className="mt-6 rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <summary className="cursor-pointer text-sm font-semibold text-[#2f6064] dark:text-teal-300">Adjust assumptions (optional)</summary>
            <div className={`mt-4 ${formGrid2Cls}`}>
              <NumField label="Investment growth on the capital (%)" value={data.dis.growth} step={0.5} onChange={(n) => patch("dis", (d) => ({ ...d, growth: n }))} />
              <NumField label="Inflation per year (%)" value={data.dis.infl} step={0.5} onChange={(n) => patch("dis", (d) => ({ ...d, infl: n }))} />
            </div>
          </details>
          <ResultsPanel title="Disability cover needed" rows={disOut.rows} notes={disOut.notes} />
        </div>
      )}

      {activeTab === "g-ci" && (
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">6. Severe Illness</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            A heart attack, cancer, stroke or similar brings costs medical aid doesn&apos;t fully cover. How much would you need as a lump sum?
          </p>
          <div className={formGridCls}>
            <NumField label="Medical costs not covered by medical aid" hint="Co-payments, specialised treatment, biologics, travel for treatment" value={data.ci.med} min={0} onChange={(n) => patch("ci", (c) => ({ ...c, med: n }))} />
            <NumField label="Your monthly living expenses" value={data.ci.exp} min={0} onChange={(n) => patch("ci", (c) => ({ ...c, exp: n }))} />
            <NumField label="Months of income buffer while recovering" hint="Time off work or reduced income — 6 to 24 months is common" value={data.ci.months} min={0} max={60} onChange={(n) => patch("ci", (c) => ({ ...c, months: n }))} />
            <NumField label="Debt you'd want to reduce" hint="Lowering repayments takes pressure off during recovery" value={data.ci.debt} min={0} onChange={(n) => patch("ci", (c) => ({ ...c, debt: n }))} />
            <NumField label="Lifestyle & care costs" hint="Home care, domestic help, childcare, dietary changes" value={data.ci.care} min={0} onChange={(n) => patch("ci", (c) => ({ ...c, care: n }))} />
            <NumField label="Severe illness cover you already have" hint="Also called critical illness or dread disease cover" value={data.ci.cover} min={0} onChange={(n) => patch("ci", (c) => ({ ...c, cover: n }))} />
          </div>
          <ResultsPanel title="Severe illness cover needed" rows={ciOut.rows} notes={ciOut.notes} />
        </div>
      )}

      {activeTab === "g-summary" && !summaryValidation.ok && (
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">Complete all goals first</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Your summary is available once every required field is filled on each goal tab. Optional assumption
            sections do not need to be completed. Use zero where an amount does not apply (e.g. no education
            savings yet).
          </p>
          <div className="space-y-4">
            {summaryOrder.map((key) => {
              const section = summaryValidation.sections[key];
              if (section.complete) return null;
              const tab = TABS.find((t) => t.shortfallKey === key);
              return (
                <div
                  key={key}
                  className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tab?.label ?? key}
                    </h3>
                    <button
                      type="button"
                      onClick={() => selectTab(SECTION_TAB[key])}
                      className="text-sm font-medium text-[#2f6064] underline-offset-2 hover:underline dark:text-teal-300"
                    >
                      Go to section →
                    </button>
                  </div>
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-gray-700 dark:text-gray-300">
                    {section.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "g-summary" && summaryValidation.ok && (
        <>
          <div className={cardCls}>
            <h2 className="text-lg font-semibold text-[#2f6064] dark:text-teal-300">Your Goals Summary</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              A snapshot of every goal. Red = shortfall to discuss with your adviser; green = on track.
            </p>
            <div className={summaryGridCls}>
              {summaryOrder.map((k) => {
                const s = shortfalls[k];
                if (!s) return null;
                const bad = s.gap > 0;
                return (
                  <div
                    key={k}
                    className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-700/30"
                  >
                    <h4 className="text-sm font-semibold text-[#2f6064] dark:text-teal-300">{s.label}</h4>
                    <div
                      className={`mt-1 text-xl font-bold ${bad ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                    >
                      {bad ? formatRand(s.gap) : "✓ On track"}
                    </div>
                    {bad && (
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Shortfall in {s.unit}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{s.detail}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
              Take this summary to your financial adviser — it&apos;s the starting point for your financial needs
              analysis.
            </p>
          </div>
          <p className="border-t border-gray-200 pt-4 text-[11.5px] leading-relaxed text-gray-500 dark:border-gray-700 dark:text-gray-400">
            This tool provides estimates for planning and discussion purposes only, based on the information and
            assumptions you entered. It is not financial advice, a quotation, or a needs analysis as defined in the
            FAIS Act. Product availability, underwriting, tax and estate outcomes differ per person — please confirm
            the numbers with a licensed financial adviser before making decisions.
          </p>
        </>
      )}
    </div>
  );
}
