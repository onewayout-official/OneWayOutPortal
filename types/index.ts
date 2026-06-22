export type CrmProfileExtraValue = string | number | boolean;

export interface UserProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  initials?: string;
  email: string;
  phone?: string;
  monthlyIncome: number;
  savingsGoal?: number;
  createdAt: string;
  // CRM Phase 2 Fields
  workNumber?: string;
  homeNumber?: string;
  workEmail?: string;
  dateOfBirth?: string;
  dateOfMarriage?: string;
  idNumber?: string;
  taxNumber?: string;
  occupation?: string;
  employer?: string;
  highestQualification?: string;
  gender?: "Male" | "Female" | "Other";
  maritalStatus?:
    | "unknown"
    | "unmarried"
    | "married_in_cop"
    | "married_out_cop_w_accrual"
    | "married_out_cop"
    | "common_law"
    | "divorced"
    | "widowed"
    | "married_unknown";
  sourceOfWealth?:
    | "accumulated_savings"
    | "sale_of_assets"
    | "investment_returns"
    | "inheritance_donations"
    | "court_orders_settlements"
    | "legitimate_winnings";
  industryClassification?:
    | "accounting_auditing"
    | "agriculture_farming"
    | "cash_forex_crypto"
    | "charitable_religious"
    | "construction_real_estate"
    | "education"
    | "engineering"
    | "financial_services"
    | "government_military"
    | "hospitality_sport_entertainment"
    | "legal_practitioners"
    | "medical_healthcare"
    | "retail_manufacturing_industrial"
    | "retiree"
    | "technology"
    | "transport_logistics"
    | "unemployed";
  // Banking Fields
  bankAccountHolder?: string;
  bankCode?: number;
  bankName?: string;
  bankBranchCode?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
  crmProfileData?: Record<string, CrmProfileExtraValue>;
  // Onboarding fields
  mood?: "😊" | "😐" | "😔";
  capital?: number;
  debts?: number;
  lastIncome?: number;
  lastExpenses?: number;
  incomeGoals?: number;
  savingGoals?: number;
  onboardingCompleted?: boolean;
  /** User chose "Skip for now" on onboarding; cleared when they complete setup */
  onboardingSkipped?: boolean;
  /** Redeemable points earned from tasks (Earn screen), spent on Spend screen */
  userPoints?: number;
  /** Membership tier computed from onboarding answers */
  membership?: MembershipTier;
  /** Last onboarding step reached (1-7) for resume/autosave */
  onboardingStep?: number;
  /** Onboarding v2 answers */
  onboardingMood?: OnboardingMood;
  role?: "admin" | "user" | "counselor";
  debtStatus?: DebtStatus;
  savingsStatus?: SavingsStatus;
  investmentStatus?: InvestmentStatus;
  incomeStability?: IncomeStability;
  emergencyResilience?: EmergencyResilience;
  primaryGoal?: PrimaryGoal;
}

export type MembershipTier =
  | "Debt Crusher"
  | "Cash King"
  | "Wealth Creator"
  | "Legacy Builder";

export type OnboardingMood =
  | "overwhelmed"
  | "struggling"
  | "progressing"
  | "confident";

export type DebtStatus = "behind" | "uptodate" | "nodebt";
export type SavingsStatus = "none" | "started" | "growing";
export type InvestmentStatus = "none" | "one" | "multiple";
export type IncomeStability = "variable" | "stable_tight" | "fixed" | "multiple";
export type EmergencyResilience = "borrow" | "wipe_out" | "small_buffer" | "solid_fund";
export type PrimaryGoal = "debt" | "savings" | "investments" | "legacy";

export interface GamificationState {
  balance: number;
  spinTokens: number;
  freeSpinAvailable: boolean;
  lastFreeSpinDate: string | null;
  completedTaskKeys: string[];
  spinCost: number;
}

export interface AwardTaskResult {
  ok: boolean;
  alreadyCompleted: boolean;
  pointsAwarded: number;
  balance: number;
  spinTokenGranted: boolean;
  error?: string;
}

export interface RedeemResult {
  ok: boolean;
  balance: number;
  redeemed: number;
  error?: string;
}

export interface SpinResult {
  ok: boolean;
  prize: number;
  balance: number;
  mode?: "free" | "token" | "paid";
  error?: string;
}

export interface RewardTransaction {
  id: string;
  kind: string;
  source: string;
  pointsDelta: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface DailyMood {
  date: string;
  mood: "😊" | "😐" | "😔";
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategoryOld | SpendCategory;
  date: string;
  description?: string;
  accountId?: string;
}

/** Spend screen categories (7 fixed items with budget vs spent) */
export type SpendCategory =
  | "Grocery"
  | "Fuel"
  | "Electricity"
  | "Airtime"
  | "Water"
  | "Rent"
  | "Transport"
  | "Send to others";

export type ExpenseCategoryOld =
  | "Food & Dining"
  | "Transportation"
  | "Shopping"
  | "Bills & Utilities"
  | "Entertainment"
  | "Healthcare"
  | "Education"
  | "Other";

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
  type: DebtType;
  createdAt: string;
}

export type DebtType = "Credit Card" | "Loan" | "Mortgage" | "Other";

export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  category: "expense" | "debt" | "savings" | "general";
  priority: "high" | "medium" | "low";
}

export interface User {
  id: string;
  email: string;
  password: string; // In production, this should be hashed
  name: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  expiresAt: number;
}

export interface Asset {
  id: string;
  category: AssetCategory;
  type: "Fixed Assets" | "Current Assets";
  name: string;
  personal: number;
  spouse: number;
  points: number;
  interestRate: number;
  editable?: boolean;
}

export type AssetCategory =
  | "House"
  | "Farm"
  | "Vehicles"
  | "Investment Fund"
  | "Pension Fund"
  | "Retirement Annuity"
  | "Employee Shares"
  | "Shares"
  | "Long Term loans to Others"
  | "Household Furniture"
  | "Jewelry"
  | "Clothing & Attire"
  | "Machinery"
  | "Insurance Policies"
  | "Inventory"
  | "Cash Balance"
  | "Short term loans to Other"
  | "Prepayments"
  | "Deposits"
  | "Other";

export interface Liability {
  id: string;
  category: LiabilityCategory;
  type: "Net Worth" | "Long Term Liabilities" | "Short Term Liabilities";
  name: string;
  personal: number;
  spouse: number;
  points: number;
  interestRate: number;
  editable?: boolean;
}

export type LiabilityCategory =
  | "Equity"
  | "House"
  | "Farm"
  | "Vehicles"
  | "Long Term loans from Others"
  | "Household Furniture"
  | "Jewelry"
  | "Clothing & Attire"
  | "Credit Card"
  | "Overdraft"
  | "Short term loans to Other";

export interface Income {
  id: string;
  category: IncomeCategory;
  type: "Fixed" | "Variable";
  name: string;
  personal: number;
  spouse: number;
  points: number;
  editable?: boolean;
}

export type IncomeCategory =
  | "Salary"
  | "Rental Income"
  | "Bonus"
  | "Side Hustle"
  | "Board Fees"
  | "Commission"
  | "Business Income"
  | "Pension"
  | "Retirement Annuities"
  | "Dividends"
  | "Interest Income"
  | "Sales of Goods"
  | "Other";

export interface RegistrationExpense {
  id: string;
  category: ExpenseCategory;
  type: "Fixed" | "Variable";
  name: string;
  personal: number;
  spouse: number;
  points: number;
  editable?: boolean;
}

export type ExpenseCategory =
  | "Company Pension"
  | "Tax"
  | "Medical Aid"
  | "Investments"
  | "Retirement Annuity"
  | "Long Term Insurance"
  | "Short Term Insurance"
  | "Funeral Insurance"
  | "Bank Charges"
  | "Personal Loan Payments"
  | "Home Loan Payments"
  | "Vehicle Loan Payments"
  | "Credit Card Payments"
  | "Rental Expenses"
  | "Water & Electricity"
  | "Rates and Taxes"
  | "Groceries"
  | "Dining Out"
  | "Lunch"
  | "Subscriptions"
  | "Clothing Accounts"
  | "Fuel & Transport Expenses"
  | "Entertainment"
  | "Domestic Staff Salary"
  | "Garden Staff Salary"
  | "Kids: School Fees"
  | "Kids: After Care"
  | "Kids: Extra Mural Activities"
  | "Kids: Maintenance"
  | "Maintenance: Car"
  | "Maintenance: House"
  | "Armed Response"
  | "Internet/Data"
  | "Airtime"
  | "Family: Extended"
  | "Farm Expenses"
  | "Donations"
  | "Legal Expense"
  | "Educations"
  | "Medicine"
  | "Administration"
  | "Vacations"
  // Spend screen categories (same as SpendCategory; used in budget_expenses)
  | "Grocery"
  | "Fuel"
  | "Electricity"
  | "Airtime"
  | "Water"
  | "Rent"
  | "Transport"
  | "Send to others"
  | "Other";
