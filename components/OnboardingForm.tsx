"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfile, Asset, AssetCategory, Income, IncomeCategory, RegistrationExpense, ExpenseCategory, Liability, LiabilityCategory } from "@/types";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Check, DollarSign, Plus, Loader2 } from "lucide-react";
interface AssetEntry {
  expenses: string;
  expenseType: string;
  name: string;
  personal: number;
  spouse: number;
  total: number;
  points: number;
  interestRate: number;
  namePlaceholder: string;
}

interface IncomeEntry {
  incomeType: string;
  source: string;
  name: string;
  personal: number;
  spouse: number;
  total: number;
  points: number;
  namePlaceholder: string;
  monthlyAmount?: number;
  frequency?: string;
  annualAmount?: number;
}

interface IncomeGoalEntry {
  goalType: string;
  targetAmount: number;
  timeframe: string;
  currentProgress: number;
  priority: string;
}

interface ExpenseEntry {
  expenseCategory: string;
  expenseType: string;
  name: string;
  personal: number;
  spouse: number;
  total: number;
  points: number;
  namePlaceholder: string;
}

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  // savingsGoal initialised to 0 so canProceed() on step 6 is never permanently blocked (fix #5)
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    mood: undefined,
    capital: undefined,
    debts: undefined,
    lastIncome: undefined,
    lastExpenses: undefined,
    incomeGoals: undefined,
    savingGoals: undefined,
    savingsGoal: 0,
  });
  const [assetAmounts, setAssetAmounts] = useState<Record<string, number>>({
    "Savings": 0,
    "Investments": 0,
    "Property": 0,
    "Vehicles": 0,
    "Other": 0,
  });
  const [assetEntries, setAssetEntries] = useState<AssetEntry[]>([
    { expenses: "House", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Property Name" },
    { expenses: "Farm", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Property Name" },
    { expenses: "Vehicles", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Vehicle Name" },
    { expenses: "Investment Fund", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Investment Name" },
    { expenses: "Pension Fund", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Pension Fund Name" },
    { expenses: "Retirement Annuity", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Retirement Fund Name" },
    { expenses: "Employee Shares", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Company Name" },
    { expenses: "Shares", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Share Name" },
    { expenses: "Long Term loans to Others", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Name" },
    { expenses: "Household Furniture", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Jewelry", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Clothing & Attire", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Machinery", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Insurance Policies", expenseType: "Fixed Assets", name: "", personal: 0, spouse: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Insurer Name" },
    { expenses: "Inventory", expenseType: "Current Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Cash Balance", expenseType: "Current Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Short term loans to Other", expenseType: "Current Assets", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Prepayments", expenseType: "Current Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Deposits", expenseType: "Current Assets", name: "", personal: 0, spouse: 0, total: 0, points: 25, interestRate: 0, namePlaceholder: "Various" },
  ]);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    expenses: "",
    expenseType: "",
    name: "",
    personal: 0,
    spouse: 0,
    total: 0,
    points: 0,
    interestRate: 0,
    namePlaceholder: "",
  });
  const [liabilityEntries, setLiabilityEntries] = useState<AssetEntry[]>([
    { expenses: "Equity", expenseType: "Net Worth", name: "", personal: 0, spouse: 0, total: 0, points: 0, interestRate: 0, namePlaceholder: "Net Worth" },
    { expenses: "House", expenseType: "Long Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Property Name" },
    { expenses: "Farm", expenseType: "Long Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 75, interestRate: 0, namePlaceholder: "Property Name" },
    { expenses: "Vehicles", expenseType: "Long Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 75, interestRate: 0, namePlaceholder: "Vehicle Name" },
    { expenses: "Long Term loans from Others", expenseType: "Long Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Name" },
    { expenses: "Household Furniture", expenseType: "Long Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Jewelry", expenseType: "Short Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Clothing & Attire", expenseType: "Short Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Various" },
    { expenses: "Credit Card", expenseType: "Short Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Bank Name" },
    { expenses: "Overdraft", expenseType: "Short Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Bank Name" },
    { expenses: "Short term loans to Other", expenseType: "Short Term Liabilities", name: "", personal: 0, spouse: 0, total: 0, points: 50, interestRate: 0, namePlaceholder: "Various" },
  ]);
  const [isAddLiabilityModalOpen, setIsAddLiabilityModalOpen] = useState(false);
  const [newLiability, setNewLiability] = useState({
    expenses: "",
    expenseType: "",
    name: "",
    personal: 0,
    spouse: 0,
    total: 0,
    points: 0,
    interestRate: 0,
    namePlaceholder: "",
  });
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([
    { incomeType: "Salary", source: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 500, namePlaceholder: "Employer Name" },
    { incomeType: "Rental Income", source: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 200, namePlaceholder: "Leasee Name" },
    { incomeType: "Bonus", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Employer Name" },
    { incomeType: "Side Hustle", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Name" },
    { incomeType: "Board Fees", source: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Employer Name" },
    { incomeType: "Commission", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Employer Name" },
    { incomeType: "Business Income", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Employer Name" },
    { incomeType: "Pension", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Pension Fund Name" },
    { incomeType: "Retirement Annuities", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Retirement Fund Name" },
    { incomeType: "Dividends", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Investment Name" },
    { incomeType: "Interest Income", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Investment Name" },
    { incomeType: "Sales of Goods", source: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Good Name" },
  ]);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [newIncome, setNewIncome] = useState({
    incomeType: "",
    source: "",
    name: "",
    personal: 0,
    spouse: 0,
    total: 0,
    points: 0,
    namePlaceholder: "",
  });

  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([
    { expenseCategory: "Company Pension", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 500, namePlaceholder: "Pension Fund Name" },
    { expenseCategory: "Tax", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 200, namePlaceholder: "NAMRA" },
    { expenseCategory: "Medical Aid", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 200, namePlaceholder: "Medical Aid Name" },
    { expenseCategory: "Investments", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 105, namePlaceholder: "Investment Name" },
    { expenseCategory: "Retirement Annuity", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Fund Name" },
    { expenseCategory: "Long Term Insurance", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Insurer Name" },
    { expenseCategory: "Short Term Insurance", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Insurer Name" },
    { expenseCategory: "Funeral Insurance", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Insurer Name" },
    { expenseCategory: "Bank Charges", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Bank Name" },
    { expenseCategory: "Personal Loan Payments", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
    { expenseCategory: "Home Loan Payments", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
    { expenseCategory: "Vehicle Loan Payments", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
    { expenseCategory: "Credit Card Payments", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
    { expenseCategory: "Rental Expenses", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Property Name" },
    { expenseCategory: "Water & Electricity", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Property Name" },
    { expenseCategory: "Rates and Taxes", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Property Name" },
    { expenseCategory: "Groceries", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Various" },
    { expenseCategory: "Dining Out", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Lunch", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Subscriptions", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Various" },
    { expenseCategory: "Clothing Accounts", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Various" },
    { expenseCategory: "Fuel & Transport Expenses", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 50, namePlaceholder: "Various" },
    { expenseCategory: "Entertainment", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Domestic Staff Salary", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Staff Name" },
    { expenseCategory: "Garden Staff Salary", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Staff Name" },
    { expenseCategory: "Kids: School Fees", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
    { expenseCategory: "Kids: After Care", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
    { expenseCategory: "Kids: Extra Mural Activities", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
    { expenseCategory: "Kids: Maintenance", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
    { expenseCategory: "Maintenance: Car", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Various" },
    { expenseCategory: "Maintenance: House", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Various" },
    { expenseCategory: "Armed Response", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Company Name" },
    { expenseCategory: "Internet/Data", expenseType: "Fixed", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Company Name" },
    { expenseCategory: "Airtime", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 25, namePlaceholder: "Company Name" },
    { expenseCategory: "Family: Extended", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Farm Expenses", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Donations", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Legal Expense", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Educations", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Medicine", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Administration", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Various" },
    { expenseCategory: "Vacations", expenseType: "Variable", name: "", personal: 0, spouse: 0, total: 0, points: 10, namePlaceholder: "Destination" },
  ]);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    expenseCategory: "",
    expenseType: "",
    name: "",
    personal: 0,
    spouse: 0,
    total: 0,
    points: 0,
    namePlaceholder: "",
  });
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalSteps = 6;

  const updateFormData = (field: keyof UserProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAssetAmount = (category: string, amount: number) => {
    setAssetAmounts((prev) => {
      const updated = { ...prev, [category]: amount };
      const total = Object.values(updated).reduce((sum, val) => sum + val, 0);
      updateFormData("capital", total);
      return updated;
    });
  };

  const updateAssetEntry = (index: number, field: keyof AssetEntry, value: string | number) => {
    setAssetEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated[index].total = updated[index].personal + updated[index].spouse;
      }
      const totalCapital = updated.reduce((sum, entry) => sum + entry.total, 0);
      updateFormData("capital", totalCapital);
      return updated;
    });
  };

  const openAddAssetModal = () => {
    setIsAddAssetModalOpen(true);
  };

  const closeAddAssetModal = () => {
    setIsAddAssetModalOpen(false);
    setNewAsset({
      expenses: "",
      expenseType: "",
      name: "",
      personal: 0,
      spouse: 0,
      total: 0,
      points: 0,
      interestRate: 0,
      namePlaceholder: "",
    });
  };

  const updateNewAsset = (field: keyof typeof newAsset, value: string | number) => {
    setNewAsset((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated.total = updated.personal + updated.spouse;
      }
      return updated;
    });
  };

  const addNewAsset = () => {
    if (newAsset.expenses.trim() && newAsset.expenseType.trim()) {
      setAssetEntries((prev) => [...prev, { ...newAsset, namePlaceholder: newAsset.name || "Name" }]);
      closeAddAssetModal();
    }
  };

  const updateLiabilityEntry = (index: number, field: keyof AssetEntry, value: string | number) => {
    setLiabilityEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated[index].total = updated[index].personal + updated[index].spouse;
      }
      const totalLiabilities = updated.reduce((sum, entry) => sum + entry.total, 0);
      updateFormData("debts", totalLiabilities);
      return updated;
    });
  };

  const openAddLiabilityModal = () => {
    setIsAddLiabilityModalOpen(true);
  };

  const closeAddLiabilityModal = () => {
    setIsAddLiabilityModalOpen(false);
    setNewLiability({
      expenses: "",
      expenseType: "",
      name: "",
      personal: 0,
      spouse: 0,
      total: 0,
      points: 0,
      interestRate: 0,
      namePlaceholder: "",
    });
  };

  const updateNewLiability = (field: keyof typeof newLiability, value: string | number) => {
    setNewLiability((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated.total = updated.personal + updated.spouse;
      }
      return updated;
    });
  };

  const addNewLiability = () => {
    if (newLiability.expenses.trim() && newLiability.expenseType.trim()) {
      setLiabilityEntries((prev) => [...prev, { ...newLiability, namePlaceholder: newLiability.name || "Name" }]);
      closeAddLiabilityModal();
    }
  };

  const updateIncomeEntry = (index: number, field: keyof IncomeEntry, value: string | number) => {
    setIncomeEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated[index].total = (Number(updated[index].personal) || 0) + (Number(updated[index].spouse) || 0);
      }
      // Update total income in formData
      const totalIncome = updated.reduce((sum, entry) => sum + ((entry.personal || 0) + (entry.spouse || 0)), 0);
      updateFormData("lastIncome", totalIncome);
      return updated;
    });
  };

  const openAddIncomeModal = () => {
    setIsAddIncomeModalOpen(true);
  };

  const closeAddIncomeModal = () => {
    setIsAddIncomeModalOpen(false);
    setNewIncome({
      incomeType: "",
      source: "",
      name: "",
      personal: 0,
      spouse: 0,
      total: 0,
      points: 0,
      namePlaceholder: "",
    });
  };

  const updateNewIncome = (field: keyof typeof newIncome, value: string | number) => {
    setNewIncome((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated.total = (Number(updated.personal) || 0) + (Number(updated.spouse) || 0);
      }
      return updated;
    });
  };

  const addNewIncome = () => {
    if (newIncome.incomeType.trim()) {
      setIncomeEntries((prev) => [...prev, { ...newIncome }]);
      closeAddIncomeModal();
    }
  };



  const updateExpenseEntry = (index: number, field: keyof ExpenseEntry, value: string | number) => {
    setExpenseEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated[index].total = (Number(updated[index].personal) || 0) + (Number(updated[index].spouse) || 0);
      }
      // Update total expenses in formData
      const totalExpenses = updated.reduce((sum, entry) => sum + ((entry.personal || 0) + (entry.spouse || 0)), 0);
      updateFormData("lastExpenses", totalExpenses);
      return updated;
    });
  };

  const openAddExpenseModal = () => {
    setIsAddExpenseModalOpen(true);
  };

  const closeAddExpenseModal = () => {
    setIsAddExpenseModalOpen(false);
    setNewExpense({
      expenseCategory: "",
      expenseType: "",
      name: "",
      personal: 0,
      spouse: 0,
      total: 0,
      points: 0,
      namePlaceholder: "",
    });
  };

  const updateNewExpense = (field: keyof typeof newExpense, value: string | number) => {
    setNewExpense((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'personal' || field === 'spouse') {
        updated.total = (Number(updated.personal) || 0) + (Number(updated.spouse) || 0);
      }
      return updated;
    });
  };

  const addNewExpense = () => {
    if (newExpense.expenseCategory.trim()) {
      setExpenseEntries((prev) => [...prev, { ...newExpense }]);
      closeAddExpenseModal();
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  /** True when the user is on the income step with zero total income (fix #15) */
  const showZeroIncomeWarning =
    currentStep === 2 &&
    incomeEntries.reduce((s, e) => s + (e.personal || 0) + (e.spouse || 0), 0) === 0;

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get existing profile or create new one (name comes from Supabase profile/trigger)
      let profile = await storage.getProfile();
      if (!profile) {
        profile = {
          id: user.userId,
          name: "",
          email: user.email || "",
          monthlyIncome: 0,
          createdAt: new Date().toISOString(),
        };
      }

      // Update profile with onboarding data
      const updatedProfile: UserProfile = {
        ...profile,
        ...formData,
        onboardingCompleted: true,
        monthlyIncome: formData.lastIncome || profile.monthlyIncome,
        savingsGoal: formData.savingsGoal ?? formData.savingGoals ?? profile.savingsGoal,
      };

      await storage.saveProfile(updatedProfile);

      // Sync onboarding income to the income table
      const incomeToSave: Income[] = incomeEntries
        .filter((e) => e.personal > 0 || e.spouse > 0 || (e.name && e.name.trim() !== ""))
        .map((e) => ({
          id: crypto.randomUUID(),
          category: e.incomeType as IncomeCategory,
          type: (e.source === "Fixed" || e.source === "Variable" ? e.source : "Variable") as Income["type"],
          name: (e.name && e.name.trim()) || e.incomeType,
          personal: e.personal,
          spouse: e.spouse,
          points: e.points,
          editable: true,
        }));
      if (incomeToSave.length > 0) {
        await storage.saveIncome(incomeToSave);
      }

      // Sync onboarding expense entries to the budget_expenses table
      const budgetExpensesToSave: RegistrationExpense[] = expenseEntries
        .filter((e) => e.personal > 0 || e.spouse > 0 || (e.name && e.name.trim() !== ""))
        .map((e) => ({
          id: crypto.randomUUID(),
          category: e.expenseCategory as ExpenseCategory,
          type: (e.expenseType === "Fixed" || e.expenseType === "Variable" ? e.expenseType : "Variable") as RegistrationExpense["type"],
          name: (e.name && e.name.trim()) || e.expenseCategory,
          personal: e.personal,
          spouse: e.spouse,
          points: e.points,
          editable: true,
        }));
      if (budgetExpensesToSave.length > 0) {
        await storage.saveBudgetExpenses(budgetExpensesToSave);
      }

      // Sync onboarding assets to the assets table
      const assetsToSave: Asset[] = assetEntries
        .filter((e) => e.personal > 0 || e.spouse > 0 || (e.name && e.name.trim() !== ""))
        .map((e) => ({
          id: crypto.randomUUID(),
          category: e.expenses as AssetCategory,
          type: e.expenseType as "Fixed Assets" | "Current Assets",
          name: (e.name && e.name.trim()) || e.expenses,
          personal: e.personal,
          spouse: e.spouse,
          points: e.points,
          interestRate: e.interestRate ?? 0,
          editable: true,
        }));
      if (assetsToSave.length > 0) {
        await storage.saveAssets(assetsToSave);
      }

      // Sync onboarding liabilities to the liabilities table
      const liabilitiesToSave: Liability[] = liabilityEntries
        .filter((e) => e.personal > 0 || e.spouse > 0 || (e.name && e.name.trim() !== ""))
        .map((e) => ({
          id: crypto.randomUUID(),
          category: e.expenses as LiabilityCategory,
          type: e.expenseType as Liability["type"],
          name: (e.name && e.name.trim()) || e.expenses,
          personal: e.personal,
          spouse: e.spouse,
          points: e.points,
          interestRate: e.interestRate ?? 0,
          editable: true,
        }));
      if (liabilitiesToSave.length > 0) {
        await storage.saveLiabilities(liabilitiesToSave);
      }

      // If there are debts, create debt entries
      if (formData.debts && formData.debts > 0) {
        const existingDebts = await storage.getDebts();
        if (existingDebts.length === 0) {
          await storage.addDebt({
            id: `debt-${Date.now()}`,
            name: "Initial Debt",
            totalAmount: formData.debts,
            remainingAmount: formData.debts,
            interestRate: 0,
            minimumPayment: formData.debts * 0.02,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            type: "Other",
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Show success state briefly before redirecting
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Onboarding submission error:", error);
      setSubmitError("Something went wrong while saving your data. Please try again.");
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.mood !== undefined;
      case 2:
        // Allow zero income (e.g. unemployed) but show warning banner (fix #15)
        return formData.lastIncome !== undefined && formData.lastIncome >= 0;
      case 3:
        return formData.lastExpenses !== undefined && formData.lastExpenses >= 0;
      case 4:
        return formData.capital !== undefined && formData.capital >= 0;
      case 5:
        return formData.debts !== undefined && formData.debts >= 0;
      case 6:
        // savingsGoal is initialised to 0 so this never blocks (fix #5)
        return formData.savingsGoal !== undefined && formData.savingsGoal >= 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">How are you feeling?</h2>
              <p className="text-gray-600 dark:text-gray-400">Select your current mood</p>
            </div>
            <div className="flex justify-center gap-8">
              {(["😊", "😐", "😔"] as const).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => updateFormData("mood", emoji)}
                  className={`text-6xl p-4 rounded-lg transition-all ${formData.mood === emoji
                    ? "bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-500 scale-110"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Income Sources</h2>
              <p className="text-gray-600 dark:text-gray-400">Enter your income details</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Income</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Income Type</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Spouse</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Total</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeEntries.map((entry, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{entry.incomeType}</td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{entry.source}</td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="text"
                            value={entry.name || ''}
                            onChange={(e) => updateIncomeEntry(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder={entry.namePlaceholder}
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.personal || ''}
                            onChange={(e) => updateIncomeEntry(index, 'personal', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.spouse || ''}
                            onChange={(e) => updateIncomeEntry(index, 'spouse', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white font-medium whitespace-normal">
                          N${((entry.personal || 0) + (entry.spouse || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{(entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Personal</span>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      N${incomeEntries.reduce((sum, entry) => sum + (entry.personal || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Spouse</span>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      N${incomeEntries.reduce((sum, entry) => sum + (entry.spouse || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Points</span>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {incomeEntries.reduce((sum, entry) => sum + ((entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0), 0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Income</span>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      N${incomeEntries.reduce((sum, entry) => sum + ((entry.personal || 0) + (entry.spouse || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={openAddIncomeModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Income Source
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        const totalFixedExpenses = expenseEntries.filter(e => e.expenseType === 'Fixed').reduce((sum, entry) => sum + (entry.total || 0), 0);
        const totalVariableExpenses = expenseEntries.filter(e => e.expenseType === 'Variable').reduce((sum, entry) => sum + (entry.total || 0), 0);
        const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.total || 0), 0);
        const totalExpensePoints = expenseEntries.reduce((sum, entry) => sum + ((entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0), 0);
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4">
                <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Expenses</h2>
              <p className="text-gray-600 dark:text-gray-400">Enter your expense details</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Expenses</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Expense Type</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Spouse</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Total</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseEntries.map((entry, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{entry.expenseCategory}</td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{entry.expenseType}</td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="text"
                            value={entry.name || ''}
                            onChange={(e) => updateExpenseEntry(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder={entry.namePlaceholder}
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.personal || ''}
                            onChange={(e) => updateExpenseEntry(index, 'personal', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.spouse || ''}
                            onChange={(e) => updateExpenseEntry(index, 'spouse', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white font-medium whitespace-normal">
                          N${((entry.personal || 0) + (entry.spouse || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{(entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Fixed</span>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      N${totalFixedExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Variable</span>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      N${totalVariableExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Points</span>
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {totalExpensePoints}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Expenses</span>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      N${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={openAddExpenseModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </button>
              </div>
            </div>
          </div >
        );

      case 4:
        const totalCapital = assetEntries.reduce((sum, entry) => sum + entry.total, 0);
        const totalPersonal = assetEntries.reduce((sum, entry) => sum + entry.personal, 0);
        const totalSpouse = assetEntries.reduce((sum, entry) => sum + entry.spouse, 0);
        const totalPoints = assetEntries.reduce((sum, entry) => sum + ((entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0), 0);
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Capital / Assets</h2>
              <p className="text-gray-600 dark:text-gray-400">Enter your asset details</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Assets</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300 w-32">Asset Type</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Spouse</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Total</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Points</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Interest Rate*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetEntries.map((entry, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{entry.expenses}</td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white w-32 whitespace-normal">{entry.expenseType}</td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => updateAssetEntry(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder={entry.namePlaceholder}
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.personal || ''}
                            onChange={(e) => updateAssetEntry(index, 'personal', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.spouse || ''}
                            onChange={(e) => updateAssetEntry(index, 'spouse', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white font-medium whitespace-normal">
                          N${entry.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{(entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0}</td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.interestRate || ''}
                            onChange={(e) => updateAssetEntry(index, 'interestRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Personal</span>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Spouse</span>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      N${totalSpouse.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Points</span>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {totalPoints}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Assets</span>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      N${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={openAddAssetModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Asset
                </button>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Where applicable. Alternatively, please enter the annual growth rate, appreciation or return you wish to achieve with this asset/investment. This is to help us make appropriate recommendations in the future.
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        const totalLiabilities = liabilityEntries.reduce((sum, entry) => sum + entry.total, 0);
        const totalPersonalLiabilities = liabilityEntries.reduce((sum, entry) => sum + entry.personal, 0);
        const totalSpouseLiabilities = liabilityEntries.reduce((sum, entry) => sum + entry.spouse, 0);
        const totalLiabilityPoints = liabilityEntries.reduce((sum, entry) => sum + ((entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0), 0);
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <DollarSign className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Liabilities</h2>
              <p className="text-gray-600 dark:text-gray-400">Enter your liability details</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Liabilities</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300 w-32">Liability Type</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Spouse</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Total</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Points</th>
                      <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Interest Rate*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liabilityEntries.map((entry, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{entry.expenses}</td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white w-32 whitespace-normal">{entry.expenseType}</td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => updateLiabilityEntry(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder={entry.namePlaceholder}
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.personal || ''}
                            onChange={(e) => updateLiabilityEntry(index, 'personal', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            step="0.01"
                            min="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.spouse || ''}
                            onChange={(e) => updateLiabilityEntry(index, 'spouse', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0"
                            step="0.01"
                            min="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white font-medium whitespace-normal">
                          N${entry.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">{(entry.personal > 0 || entry.spouse > 0) ? (entry.points ?? 0) : 0}</td>
                        <td className="py-2 px-2 whitespace-normal">
                          <input
                            type="number"
                            value={entry.interestRate || ''}
                            onChange={(e) => updateLiabilityEntry(index, 'interestRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Personal</span>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      N${totalPersonalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Spouse</span>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      N${totalSpouseLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Points</span>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {totalLiabilityPoints}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Liabilities</span>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      N${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={openAddLiabilityModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Liability
                </button>
              </div>
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Please enter the interest rate you are currently paying to the loan or credit facility. This to help ensure you are not been exploited and to make appropriate recommendations in the future.
                </p>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Monthly savings goal</h2>
              <p className="text-gray-600 dark:text-gray-400">How much would you like to save each month?</p>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <label htmlFor="savingsGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (N$)
                </label>
                <input
                  id="savingsGoal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.savingsGoal ?? ""}
                  onChange={(e) => updateFormData("savingsGoal", parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-lg"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-8xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Zero-income warning banner (fix #15) */}
        {showZeroIncomeWarning && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg flex items-start gap-2">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You haven't entered any income yet. You can still continue, but your dashboard figures will be inaccurate.
            </p>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[300px] flex items-center justify-center py-8">
          {renderStep()}
        </div>

        {/* Submit error message */}
        {submitError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg flex items-start gap-2">
            <span className="text-red-500 text-lg leading-none mt-0.5">⚠️</span>
            <p className="text-sm text-red-800 dark:text-red-200">{submitError}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
            className="flex items-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-all duration-300 disabled:cursor-not-allowed ${
                submitSuccess
                  ? "bg-green-500 scale-105 shadow-lg shadow-green-500/30"
                  : isSubmitting
                  ? "bg-green-600 opacity-80 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 disabled:opacity-50"
              }`}
            >
              {isSubmitting && !submitSuccess ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving your data...
                </>
              ) : submitSuccess ? (
                <>
                  <Check className="h-5 w-5" />
                  All done! Redirecting...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Asset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assets
                </label>
                <input
                  type="text"
                  value={newAsset.expenses}
                  onChange={(e) => updateNewAsset('expenses', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Asset name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asset Type
                </label>
                <input
                  type="text"
                  value={newAsset.expenseType}
                  onChange={(e) => updateNewAsset('expenseType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Asset type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newAsset.name}
                  onChange={(e) => updateNewAsset('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Specific name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personal
                  </label>
                  <input
                    type="number"
                    value={newAsset.personal || ''}
                    onChange={(e) => updateNewAsset('personal', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse
                  </label>
                  <input
                    type="number"
                    value={newAsset.spouse || ''}
                    onChange={(e) => updateNewAsset('spouse', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total
                </label>
                <input
                  type="number"
                  value={newAsset.total.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={newAsset.points}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeAddAssetModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addNewAsset}
                disabled={!newAsset.expenses.trim() || !newAsset.expenseType.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Liability Modal */}
      {isAddLiabilityModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Liability</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Liabilities
                </label>
                <input
                  type="text"
                  value={newLiability.expenses}
                  onChange={(e) => updateNewLiability('expenses', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Liability name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Liability Type
                </label>
                <input
                  type="text"
                  value={newLiability.expenseType}
                  onChange={(e) => updateNewLiability('expenseType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Liability type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newLiability.name}
                  onChange={(e) => updateNewLiability('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Specific name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personal
                  </label>
                  <input
                    type="number"
                    value={newLiability.personal || ''}
                    onChange={(e) => updateNewLiability('personal', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse
                  </label>
                  <input
                    type="number"
                    value={newLiability.spouse || ''}
                    onChange={(e) => updateNewLiability('spouse', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total
                </label>
                <input
                  type="number"
                  value={newLiability.total.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={newLiability.points}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Interest Rate
                </label>
                <input
                  type="number"
                  value={newLiability.interestRate || ''}
                  onChange={(e) => updateNewLiability('interestRate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeAddLiabilityModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addNewLiability}
                disabled={!newLiability.expenses.trim() || !newLiability.expenseType.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add Liability
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Income Modal */}
      {isAddIncomeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Income Source</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Income
                </label>
                <input
                  type="text"
                  value={newIncome.incomeType}
                  onChange={(e) => updateNewIncome('incomeType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Salary, Business Income"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Income Type
                </label>
                <input
                  type="text"
                  value={newIncome.source}
                  onChange={(e) => updateNewIncome('source', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Main Job, Side Hustle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newIncome.name}
                  onChange={(e) => updateNewIncome('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Employer Name, Business Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personal
                  </label>
                  <input
                    type="number"
                    value={newIncome.personal || ''}
                    onChange={(e) => updateNewIncome('personal', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse
                  </label>
                  <input
                    type="number"
                    value={newIncome.spouse || ''}
                    onChange={(e) => updateNewIncome('spouse', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total
                </label>
                <input
                  type="number"
                  value={newIncome.total.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={newIncome.points}
                  onChange={(e) => updateNewIncome('points', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeAddIncomeModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addNewIncome}
                disabled={!newIncome.incomeType.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add Income Source
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Expense</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newExpense.expenseCategory}
                  onChange={(e) => updateNewExpense('expenseCategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. Groceries, Rent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newExpense.expenseType}
                  onChange={(e) => updateNewExpense('expenseType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Type</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Variable">Variable</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => updateNewExpense('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Specific name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personal
                  </label>
                  <input
                    type="number"
                    value={newExpense.personal || ''}
                    onChange={(e) => updateNewExpense('personal', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse
                  </label>
                  <input
                    type="number"
                    value={newExpense.spouse || ''}
                    onChange={(e) => updateNewExpense('spouse', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total
                </label>
                <input
                  type="number"
                  value={(newExpense.total || 0).toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeAddExpenseModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addNewExpense}
                disabled={!newExpense.expenseCategory.trim() || !newExpense.expenseType.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

