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

export type FinancialGoalsFormData = {
  retire: RetirementInput;
  death: DeathInput;
  study: StudyInput;
  debt: DebtInput;
  dis: DisabilityInput;
  ci: SevereIllnessInput;
};

export type SummarySectionValidation = {
  complete: boolean;
  missing: string[];
};

export type SummaryValidationResult = {
  ok: boolean;
  sections: Record<ShortfallKey, SummarySectionValidation>;
};

function positive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function nonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

/** All form fields required for the summary, including assumptions. */
export function validateFinancialGoalsForSummary(data: FinancialGoalsFormData): SummaryValidationResult {
  const sections: Record<ShortfallKey, SummarySectionValidation> = {
    retire: { complete: false, missing: [] },
    death: { complete: false, missing: [] },
    study: { complete: false, missing: [] },
    debt: { complete: false, missing: [] },
    dis: { complete: false, missing: [] },
    ci: { complete: false, missing: [] },
  };

  const r = data.retire;
  const retireMissing: string[] = [];
  if (!positive(r.age)) retireMissing.push("Your current age");
  if (!positive(r.retAge)) retireMissing.push("Age you want to retire");
  if (positive(r.age) && positive(r.retAge) && r.retAge <= r.age) {
    retireMissing.push("Retirement age must be after your current age");
  }
  if (!positive(r.income)) retireMissing.push("Current monthly income (before tax)");
  if (!positive(r.pct)) retireMissing.push("% of income needed in retirement");
  if (!nonNegative(r.saved)) retireMissing.push("Retirement savings you already have");
  if (!nonNegative(r.pm)) retireMissing.push("Amount you save for retirement each month");
  if (!positive(r.growth)) retireMissing.push("Investment growth per year (%)");
  if (!positive(r.infl)) retireMissing.push("Inflation per year (%)");
  if (!positive(r.years)) retireMissing.push("Years your money must last in retirement");
  if (!positive(r.postGrowth)) retireMissing.push("Growth after retirement (%)");
  sections.retire = { complete: retireMissing.length === 0, missing: retireMissing };

  const d = data.death;
  const deathMissing: string[] = [];
  if (!positive(d.incNeed)) deathMissing.push("Monthly income your family would need");
  if (!positive(d.years)) deathMissing.push("For how many years?");
  if (!nonNegative(d.debt)) deathMissing.push("Debts to be settled at death");
  if (!nonNegative(d.edu)) deathMissing.push("Education amount to set aside");
  if (!positive(d.funeral)) deathMissing.push("Funeral & immediate costs");
  if (!nonNegative(d.estate)) deathMissing.push("Estimated value of your estate");
  if (!nonNegative(d.cover)) deathMissing.push("Life cover you already have");
  if (!nonNegative(d.assets)) deathMissing.push("Savings/investments available to your family");
  if (!positive(d.growth)) deathMissing.push("Investment growth on the capital (%)");
  if (!positive(d.infl)) deathMissing.push("Inflation per year (%)");
  sections.death = { complete: deathMissing.length === 0, missing: deathMissing };

  const st = data.study;
  const studyMissing: string[] = [];
  if (st.rows.length === 0) {
    studyMissing.push("Add at least one child or study goal");
  } else {
    st.rows.forEach((row, i) => {
      const label = row.name.trim() || `Row ${i + 1}`;
      if (!row.name.trim()) studyMissing.push(`${label}: child / goal name`);
      if (!nonNegative(row.start)) studyMissing.push(`${label}: years until studies start`);
      if (!positive(row.len)) studyMissing.push(`${label}: length of studies (years)`);
      if (!positive(row.cost)) studyMissing.push(`${label}: cost per year today`);
    });
  }
  if (!nonNegative(st.saved)) studyMissing.push("Education savings you already have");
  if (!nonNegative(st.pm)) studyMissing.push("Amount you save for education each month");
  if (!positive(st.infl)) studyMissing.push("Education inflation per year (%)");
  if (!positive(st.growth)) studyMissing.push("Investment growth per year (%)");
  sections.study = { complete: studyMissing.length === 0, missing: studyMissing };

  const db = data.debt;
  const debtMissing: string[] = [];
  const activeDebtRows = db.rows.filter(
    (row) =>
      row.cred.trim() !== "" ||
      row.arr > 0 ||
      row.mths > 0 ||
      row.rate > 0 ||
      row.inst > 0
  );
  if (activeDebtRows.length === 0) {
    // No arrears listed — only budget/strategy apply; budget must be filled (0 = none extra).
    if (!nonNegative(db.budget)) debtMissing.push("Extra amount you can pay per month");
  } else {
    activeDebtRows.forEach((row, i) => {
      const label = row.cred.trim() || `Debt row ${i + 1}`;
      if (!row.cred.trim()) debtMissing.push(`${label}: creditor name`);
      if (!positive(row.arr)) debtMissing.push(`${label}: amount in arrears`);
      if (!positive(row.mths)) debtMissing.push(`${label}: months behind`);
      if (!positive(row.rate)) debtMissing.push(`${label}: interest rate`);
      if (!positive(row.inst)) debtMissing.push(`${label}: normal monthly instalment`);
    });
    if (!positive(db.budget)) {
      debtMissing.push("Extra amount you can pay per month (required when you list arrears)");
    }
  }
  sections.debt = { complete: debtMissing.length === 0, missing: debtMissing };

  const dis = data.dis;
  const disMissing: string[] = [];
  if (!positive(dis.age)) disMissing.push("Your current age");
  if (!positive(dis.retAge)) disMissing.push("Planned retirement age");
  if (positive(dis.age) && positive(dis.retAge) && dis.retAge <= dis.age) {
    disMissing.push("Retirement age must be after your current age");
  }
  if (!positive(dis.incNeed)) disMissing.push("Monthly income to replace");
  if (!nonNegative(dis.debt)) disMissing.push("Debts you'd want settled");
  if (!nonNegative(dis.adjust)) disMissing.push("Once-off adjustment costs");
  if (!nonNegative(dis.cover)) disMissing.push("Disability cover you already have");
  if (!positive(dis.growth)) disMissing.push("Investment growth on the capital (%)");
  if (!positive(dis.infl)) disMissing.push("Inflation per year (%)");
  sections.dis = { complete: disMissing.length === 0, missing: disMissing };

  const ci = data.ci;
  const ciMissing: string[] = [];
  if (!nonNegative(ci.med)) ciMissing.push("Medical costs not covered by medical aid");
  if (!positive(ci.exp)) ciMissing.push("Your monthly living expenses");
  if (!positive(ci.months)) ciMissing.push("Months of income buffer while recovering");
  if (!nonNegative(ci.debt)) ciMissing.push("Debt you'd want to reduce");
  if (!nonNegative(ci.care)) ciMissing.push("Lifestyle & care costs");
  if (!nonNegative(ci.cover)) ciMissing.push("Severe illness cover you already have");
  sections.ci = { complete: ciMissing.length === 0, missing: ciMissing };

  const ok = (Object.keys(sections) as ShortfallKey[]).every((k) => sections[k].complete);
  return { ok, sections };
}
