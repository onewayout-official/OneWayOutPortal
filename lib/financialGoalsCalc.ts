export function formatRand(n: number): string {
  return "R " + Math.round(n).toLocaleString("en-ZA");
}

export function pvIncome(
  annual: number,
  years: number,
  growth: number,
  infl: number
): number {
  const rr = (1 + growth) / (1 + infl) - 1;
  if (Math.abs(rr) < 1e-9) return annual * years;
  return (annual * (1 - Math.pow(1 + rr, -years))) / rr * (1 + rr);
}

export function fvMonthly(pm: number, months: number, annualGrowth: number): number {
  const i = Math.pow(1 + annualGrowth, 1 / 12) - 1;
  if (i === 0) return pm * months;
  return (pm * (Math.pow(1 + i, months) - 1)) / i;
}

export function pmtFor(target: number, months: number, annualGrowth: number): number {
  if (months <= 0) return target;
  const i = Math.pow(1 + annualGrowth, 1 / 12) - 1;
  if (i === 0) return target / months;
  return (target * i) / (Math.pow(1 + i, months) - 1);
}

export type ResultRow = { label: string; value: string; strong?: boolean; valueClass?: string };

export type ShortfallKey = "retire" | "death" | "study" | "debt" | "dis" | "ci";

export type ShortfallEntry = {
  label: string;
  gap: number;
  unit: string;
  detail: string;
};

export type RetirementInput = {
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

export type DeathInput = {
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

export type StudyRow = {
  id: string;
  name: string;
  start: number;
  len: number;
  cost: number;
};

export type StudyInput = {
  rows: StudyRow[];
  saved: number;
  pm: number;
  infl: number;
  growth: number;
};

export type DebtRowType =
  | "Credit card"
  | "Home loan"
  | "Vehicle finance"
  | "Personal loan"
  | "Store account"
  | "Municipal / rates"
  | "School fees"
  | "SARS / tax"
  | "Other";

export type DebtRow = {
  id: string;
  cred: string;
  type: DebtRowType;
  arr: number;
  mths: number;
  rate: number;
  inst: number;
};

export type DebtStrategy = "avalanche" | "snowball" | "oldest";

export type DebtInput = {
  rows: DebtRow[];
  budget: number;
  strategy: DebtStrategy;
};

export type DisabilityInput = {
  age: number;
  retAge: number;
  incNeed: number;
  debt: number;
  adjust: number;
  cover: number;
  growth: number;
  infl: number;
};

export type SevereIllnessInput = {
  med: number;
  exp: number;
  months: number;
  debt: number;
  care: number;
  cover: number;
};

export type CalcOutput = {
  rows: ResultRow[];
  notes: string[];
  shortfall: ShortfallEntry;
};

export function calcRetirement(input: RetirementInput): CalcOutput {
  const age = input.age;
  const retAge = Math.max(input.retAge, age);
  const yrs = retAge - age;
  const months = yrs * 12;
  const growth = input.growth / 100;
  const infl = input.infl / 100;
  const post = input.postGrowth / 100;
  const needTodayMonthly = input.income * (input.pct / 100);
  const needAtRetMonthly = needTodayMonthly * Math.pow(1 + infl, yrs);
  const capitalNeeded = pvIncome(needAtRetMonthly * 12, input.years, post, infl);
  const fvExisting = input.saved * Math.pow(1 + growth, yrs);
  const fvContrib = fvMonthly(input.pm, months, growth);
  const projected = fvExisting + fvContrib;
  const gap = capitalNeeded - projected;
  const extraPM = gap > 0 ? pmtFor(gap, months, growth) : 0;

  const rows: ResultRow[] = [
    {
      label: `Income you'll need per month at ${retAge} (future money)`,
      value: formatRand(needAtRetMonthly),
    },
    { label: `Capital needed at ${retAge} to provide that income`, value: formatRand(capitalNeeded) },
    { label: "What your current savings should grow to", value: formatRand(fvExisting) },
    { label: "What your monthly saving should grow to", value: formatRand(fvContrib) },
    { label: "Total projected at retirement", value: formatRand(projected), strong: true },
    gap > 0
      ? { label: "Shortfall", value: formatRand(gap), strong: true, valueClass: "neg" }
      : {
          label: "Result",
          value: `Covered ✓ (surplus ${formatRand(-gap)})`,
          strong: true,
          valueClass: "pos",
        },
  ];

  const notes: string[] =
    gap > 0
      ? [
          `To close the gap, save roughly ${formatRand(extraPM)} more per month (or retire later / adjust your target income).`,
        ]
      : [];

  return {
    rows,
    notes,
    shortfall: {
      label: "Retirement",
      gap,
      unit: "capital at retirement",
      detail: gap > 0 ? `Save about ${formatRand(extraPM)} extra per month` : "On track",
    },
  };
}

export function calcDeath(input: DeathInput): CalcOutput {
  const growth = input.growth / 100;
  const infl = input.infl / 100;
  const incomeCapital = pvIncome(input.incNeed * 12, input.years, growth, infl);
  const executor = input.estate * 0.035 * 1.15;
  const totalNeed = incomeCapital + input.debt + input.edu + input.funeral + executor;
  const totalHave = input.cover + input.assets;
  const gap = totalNeed - totalHave;

  const rows: ResultRow[] = [
    { label: "Capital to provide your family's income", value: formatRand(incomeCapital) },
    { label: "Debts to settle", value: formatRand(input.debt) },
    { label: "Education provision", value: formatRand(input.edu) },
    { label: "Funeral & immediate costs", value: formatRand(input.funeral) },
    { label: "Estate costs (executor's fees, est.)", value: formatRand(executor) },
    { label: "Total your family would need", value: formatRand(totalNeed), strong: true },
    { label: "Less: existing cover & savings", value: "− " + formatRand(totalHave) },
    gap > 0
      ? { label: "Life cover shortfall", value: formatRand(gap), strong: true, valueClass: "neg" }
      : {
          label: "Result",
          value: `Covered ✓ (surplus ${formatRand(-gap)})`,
          strong: true,
          valueClass: "pos",
        },
  ];

  return {
    rows,
    notes: [],
    shortfall: {
      label: "Death (life cover)",
      gap,
      unit: "life cover",
      detail: gap > 0 ? `Additional life cover of ${formatRand(gap)}` : "Adequately covered",
    },
  };
}

export function calcStudy(input: StudyInput): CalcOutput | null {
  const ei = input.infl / 100;
  const growth = input.growth / 100;
  if (!input.rows.length) return null;

  let totalFuture = 0;
  let firstStart = Infinity;
  const childRows: { name: string; future: number }[] = [];

  for (const row of input.rows) {
    const start = row.start || 0;
    const len = row.len || 0;
    const cost = row.cost || 0;
    let future = 0;
    for (let t = 0; t < len; t++) future += cost * Math.pow(1 + ei, start + t);
    totalFuture += future;
    firstStart = Math.min(firstStart, start);
    childRows.push({ name: row.name || "Child", future });
  }

  const horizon = isFinite(firstStart) ? firstStart : 0;
  const months = Math.max(horizon * 12, 1);
  const fvExisting = input.saved * Math.pow(1 + growth, horizon);
  const fvContrib = fvMonthly(input.pm, months, growth);
  const projected = fvExisting + fvContrib;
  const gap = totalFuture - projected;
  const extraPM = gap > 0 ? pmtFor(gap, months, growth) : 0;

  const rows: ResultRow[] = [
    ...childRows.map((r) => ({ label: `Future cost — ${r.name}`, value: formatRand(r.future) })),
    { label: "Total future cost of education", value: formatRand(totalFuture), strong: true },
    {
      label: `Projected savings by first start date (${horizon} yrs)`,
      value: formatRand(projected),
    },
    gap > 0
      ? { label: "Education shortfall", value: formatRand(gap), strong: true, valueClass: "neg" }
      : {
          label: "Result",
          value: `Covered ✓ (surplus ${formatRand(-gap)})`,
          strong: true,
          valueClass: "pos",
        },
  ];

  const notes: string[] =
    gap > 0
      ? [`To close the gap, save roughly ${formatRand(extraPM)} more per month for education.`]
      : [];

  return {
    rows,
    notes,
    shortfall: {
      label: "Study / Education",
      gap,
      unit: "education funding",
      detail: gap > 0 ? `Save about ${formatRand(extraPM)} extra per month` : "On track",
    },
  };
}

export type DebtScheduleRow = {
  order: number;
  cred: string;
  type: string;
  arr: number;
  startMonth: number;
  endMonth: number;
};

export type DebtCalcOutput = {
  rows: ResultRow[];
  notes: string[];
  schedule: DebtScheduleRow[];
  totalMonths: number;
  shortfall: ShortfallEntry;
  showNoBudgetWarning: boolean;
};

export function calcDebt(input: DebtInput): DebtCalcOutput {
  const budget = input.budget;
  const debts = input.rows.filter((d) => d.arr > 0).map((d) => ({ ...d }));

  if (!debts.length) {
    return {
      rows: [],
      notes: ["Add your arrear accounts above. If nothing is in arrears — well done, keep it that way!"],
      schedule: [],
      totalMonths: 0,
      showNoBudgetWarning: false,
      shortfall: {
        label: "Debt arrears",
        gap: 0,
        unit: "arrears",
        detail: "No arrears listed",
      },
    };
  }

  if (input.strategy === "avalanche") debts.sort((a, b) => b.rate - a.rate);
  else if (input.strategy === "snowball") debts.sort((a, b) => a.arr - b.arr);
  else debts.sort((a, b) => b.mths - a.mths);

  const totalArr = debts.reduce((s, d) => s + d.arr, 0);
  const totalInst = debts.reduce((s, d) => s + d.inst, 0);

  const rows: ResultRow[] = [
    { label: "Total amount in arrears", value: formatRand(totalArr), valueClass: "neg" },
    { label: "Your normal instalments (must keep paying)", value: `${formatRand(totalInst)} /month` },
    { label: "Extra available to catch up arrears", value: `${formatRand(budget)} /month` },
  ];

  const notes: string[] = [];
  const schedule: DebtScheduleRow[] = [];
  let totalMonths = 0;
  let showNoBudgetWarning = false;

  if (budget <= 0) {
    showNoBudgetWarning = true;
    notes.push(
      "No extra budget: you can't catch up arrears without extra payments. Consider the steps below — especially contacting creditors to make an arrangement, or speaking to a registered debt counsellor."
    );
  } else {
    let order = 1;
    let running = 0;
    for (const d of debts) {
      const startMonth = Math.floor(running / budget) + 1;
      running += d.arr;
      const endMonth = Math.ceil(running / budget);
      schedule.push({
        order: order++,
        cred: d.cred || "Unnamed",
        type: d.type,
        arr: d.arr,
        startMonth,
        endMonth,
      });
      totalMonths = endMonth;
    }
    notes.push(
      `Paying ${formatRand(budget)} extra per month, all arrears are caught up in about ${totalMonths} month${totalMonths > 1 ? "s" : ""}. Keep paying every normal instalment on time while you catch up, or the arrears will grow.`
    );
  }

  return {
    rows,
    notes,
    schedule,
    totalMonths,
    showNoBudgetWarning,
    shortfall: {
      label: "Debt arrears",
      gap: totalArr,
      unit: "arrears",
      detail:
        budget > 0 ? `Catch-up plan in place — ${debts.length} account(s)` : "Needs a payment plan",
    },
  };
}

export function calcDisability(input: DisabilityInput): CalcOutput {
  const yrs = Math.max(input.retAge - input.age, 0);
  const growth = input.growth / 100;
  const infl = input.infl / 100;
  const incomeCapital = pvIncome(input.incNeed * 12, yrs, growth, infl);
  const totalNeed = incomeCapital + input.debt + input.adjust;
  const gap = totalNeed - input.cover;

  const rows: ResultRow[] = [
    { label: `Capital to replace your income for ${yrs} years`, value: formatRand(incomeCapital) },
    { label: "Debts to settle", value: formatRand(input.debt) },
    { label: "Once-off adjustment costs", value: formatRand(input.adjust) },
    { label: "Total needed", value: formatRand(totalNeed), strong: true },
    { label: "Less: existing disability cover", value: "− " + formatRand(input.cover) },
    gap > 0
      ? { label: "Disability cover shortfall", value: formatRand(gap), strong: true, valueClass: "neg" }
      : {
          label: "Result",
          value: `Covered ✓ (surplus ${formatRand(-gap)})`,
          strong: true,
          valueClass: "pos",
        },
  ];

  return {
    rows,
    notes: [
      "Tip: income protection (a monthly benefit) is often more suitable than a lump sum for replacing salary — discuss the mix with your adviser.",
    ],
    shortfall: {
      label: "Disability",
      gap,
      unit: "disability cover",
      detail: gap > 0 ? `Additional disability cover of ${formatRand(gap)}` : "Adequately covered",
    },
  };
}

export function calcSevereIllness(input: SevereIllnessInput): CalcOutput {
  const buffer = input.exp * input.months;
  const totalNeed = input.med + buffer + input.debt + input.care;
  const gap = totalNeed - input.cover;

  const rows: ResultRow[] = [
    { label: "Medical costs not covered by medical aid", value: formatRand(input.med) },
    {
      label: `Income buffer (${input.months} months of expenses)`,
      value: formatRand(buffer),
    },
    { label: "Debt reduction", value: formatRand(input.debt) },
    { label: "Lifestyle & care costs", value: formatRand(input.care) },
    { label: "Total needed", value: formatRand(totalNeed), strong: true },
    { label: "Less: existing severe illness cover", value: "− " + formatRand(input.cover) },
    gap > 0
      ? { label: "Severe illness shortfall", value: formatRand(gap), strong: true, valueClass: "neg" }
      : {
          label: "Result",
          value: `Covered ✓ (surplus ${formatRand(-gap)})`,
          strong: true,
          valueClass: "pos",
        },
  ];

  return {
    rows,
    notes: [],
    shortfall: {
      label: "Severe Illness",
      gap,
      unit: "severe illness cover",
      detail: gap > 0 ? `Additional severe illness cover of ${formatRand(gap)}` : "Adequately covered",
    },
  };
}

export const DEBT_TYPE_OPTIONS: DebtRowType[] = [
  "Credit card",
  "Home loan",
  "Vehicle finance",
  "Personal loan",
  "Store account",
  "Municipal / rates",
  "School fees",
  "SARS / tax",
  "Other",
];

export const DEBT_CATCHUP_STEPS = [
  {
    title: "Get an up-to-date statement",
    body: 'from every creditor so you know the exact arrears, interest and fees. Ask for a "paid-up / arrears breakdown" in writing.',
  },
  {
    title: "Contact each creditor before they contact you.",
    body: "Ask for a payment arrangement on the arrears — most will accept a realistic plan and may freeze legal action while you stick to it. Get any arrangement confirmed in writing.",
  },
  {
    title: "Never skip the normal instalment",
    body: "to pay arrears on another account — that just moves the problem.",
  },
  {
    title: "Prioritise secured debts and essentials",
    body: "(home loan, vehicle, municipal account) — these carry the biggest consequences if unpaid.",
  },
  {
    title: "Ask about interest & fee concessions.",
    body: "Creditors sometimes waive penalty fees or reduce interest if you settle arrears within an agreed period.",
  },
  {
    title: "Once an account is up to date,",
    body: "ask the creditor to update your credit bureau record (Experian, TransUnion) and keep proof of payment.",
  },
  {
    title: "If the plan above is not affordable,",
    body: "speak to a registered debt counsellor about debt review (National Credit Act) before creditors take legal action — don't borrow more to pay arrears.",
  },
];
