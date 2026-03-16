"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, AlertCircle, ChevronLeft, ChevronRight, Check, Plus, Trash2, Phone } from "lucide-react";
// import GoogleLoginButton from "./GoogleLoginButton"; // Commented out for MVP
import { UserProfile, Asset, AssetCategory, Liability, LiabilityCategory, Income, IncomeCategory, RegistrationExpense, ExpenseCategory } from "@/types";
import { storage } from "@/lib/storage";

export default function RegisterForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: Account Information
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Steps 2-7: Onboarding Data
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    mood: undefined,
    capital: undefined,
    debts: undefined,
    lastIncome: undefined,
    lastExpenses: undefined,
    incomeGoals: undefined,
    savingGoals: undefined,
  });

  // Step 3: Assets (multiple)
  const [step2Assets, setStep2Assets] = useState<Asset[]>([]);

  // Step 4: Liabilities (multiple)
  const [liabilities, setLiabilities] = useState<Liability[]>([]);

  // Step 5: Income (multiple)
  const [incomes, setIncomes] = useState<Income[]>([]);

  // Step 6: Expenses (multiple)
  const [expenses, setExpenses] = useState<RegistrationExpense[]>([]);

  const { register } = useAuth();
  const router = useRouter();
  // Step 1: Personal details, Steps 2-7: Onboarding Data
  const totalSteps = 7;

  const updateFormData = (field: keyof UserProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    setError("");

    // Validate current step before proceeding
    if (currentStep === 1) {
      // Validate account information
      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }

      setIsLoading(true);
      const result = await register(name.trim(), email.trim(), password);
      
      if (!result.success) {
        setError(result.error || "Failed to create account");
        setIsLoading(false);
        return;
      }
      
      // Save initial profile data locally
      try {
        const session = await storage.getSession();
        if (session) {
          const profile = {
            id: session.userId,
            name: name.trim(),
            email: session.email || email.trim(),
            monthlyIncome: 0,
            createdAt: new Date().toISOString(),
          };
          await storage.saveProfile(profile);
        }
      } catch (err) {
        console.error("Error saving initial profile:", err);
      }

      setIsLoading(false);
      setCurrentStep(2);
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const session = await storage.getSession();
      if (!session) {
        setError("Session expired. Please try again.");
        setIsLoading(false);
        return;
      }

      let profile = await storage.getProfile();
      if (!profile) {
        profile = {
          id: session.userId,
          name: name,
          email: session.email || email,
          monthlyIncome: 0,
          createdAt: new Date().toISOString(),
        };
      }

      const totalCapital = step2Assets.reduce((sum, asset) => sum + (asset.personal || 0) + (asset.spouse || 0), 0);

      const updatedProfile: UserProfile = {
        ...profile,
        ...formData,
        capital: totalCapital,
        onboardingCompleted: true,
        monthlyIncome: formData.lastIncome || profile.monthlyIncome,
        savingsGoal: formData.savingGoals || profile.savingsGoal,
      };

      await storage.saveProfile(updatedProfile);

      if (step2Assets.length > 0) {
        for (const asset of step2Assets) {
          if (asset.name.trim() !== "") {
            await storage.addAsset(asset);
          }
        }
      }

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

      router.push("/");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    const stepToCheck = currentStep === 1 ? 1 : currentStep + 1;
    switch (stepToCheck) {
      case 1:
        return name.trim() !== "" && email.trim() !== "" && password.length >= 6;
      case 3:
        return formData.mood !== undefined;
      case 4:
        return step2Assets.length > 0 && step2Assets.every(asset => 
          asset.category && 
          asset.type && 
          asset.name.trim() !== "" && 
          asset.personal >= 0 && 
          asset.spouse >= 0 && 
          (asset.points === undefined || (asset.points >= 25 && asset.points <= 50))
        );
      case 5:
        return liabilities.length > 0 && liabilities.every(liability => 
          liability.category && 
          liability.type && 
          liability.name.trim() !== "" && 
          liability.personal > 0 && 
          liability.spouse > 0 &&
          liability.points > 0 &&
          liability.interestRate > 0
        );
      case 6:
        return incomes.length > 0 && incomes.every(income => 
          income.category && 
          income.type && 
          income.name.trim() !== "" && 
          income.personal > 0 && 
          income.spouse > 0 &&
          income.points > 0
        );
      case 7:
        return expenses.length > 0 && expenses.every(expense => 
          expense.category && 
          expense.type && 
          expense.name.trim() !== "" && 
          expense.personal > 0 && 
          expense.spouse > 0 &&
          expense.points > 0
        );
      case 8:
        // Allow 0 or any positive number
        const savingGoal = formData.savingGoals;
        if (savingGoal === undefined || savingGoal === null) return false;
        if (typeof savingGoal !== 'number') return false;
        if (isNaN(savingGoal)) return false;
        return savingGoal >= 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    const stepToRender = currentStep === 1 ? 1 : currentStep + 1;
    switch (stepToRender) {
      case 1:
  return (
          <div className="space-y-6">
            <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <UserPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Your Account</h2>
              <p className="text-gray-600 dark:text-gray-400">Let's get started with your basic information</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="John Doe"
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          </div>
        );



      case 3:
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
                  className={`text-6xl p-4 rounded-lg transition-all ${
                    formData.mood === emoji
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

      case 4:
        return (
          <div className="space-y-6 w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assets</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Add your assets and their details</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Fill in the required fields (Expenses, Expense Type, Name) to add an asset</p>
            </div>

            {step2Assets.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg border-2 border-dashed border-blue-300 dark:border-gray-600 transition-all">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
                    <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No assets added yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Start by adding your first asset below</p>
                <div className="text-xs text-gray-400 dark:text-gray-600 space-y-1">
                  <p>💡 Tip: You can add multiple assets</p>
                  <p>📝 Required fields: Expenses, Expense Type, and Name</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {step2Assets.length} {step2Assets.length === 1 ? 'asset' : 'assets'} added
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Scroll horizontally to see all fields</p>
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                  <table className="w-full border-collapse min-w-[900px]">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Expenses
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Expense Type
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[160px]">
                          <div className="flex items-center gap-1">
                            Name
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Personal (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Spouse (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Total (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Points
                          <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400 mt-0.5">(25-50)</span>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Interest Rate (%)
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {step2Assets.map((asset, index) => {
                        const total = (asset.personal || 0) + (asset.spouse || 0);
                        const isRowValid = asset.category && asset.type && asset.name.trim() !== "";
                        return (
                          <tr 
                            key={asset.id} 
                            className={`transition-colors ${
                              isRowValid 
                                ? 'hover:bg-blue-50/50 dark:hover:bg-gray-700/50' 
                                : 'bg-yellow-50/30 dark:bg-yellow-900/10 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20'
                            }`}
                          >
                            <td className="px-4 py-3 break-words">
                              <select
                                value={asset.category}
                                onChange={(e) => {
                                  const updated = [...step2Assets];
                                  updated[index].category = e.target.value as AssetCategory;
                                  setStep2Assets(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  asset.category 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                              >
                                <option value="">Select category...</option>
                                <option value="House">House</option>
                              <option value="Farm">Farm</option>
                              <option value="Vehicles">Vehicles</option>
                              <option value="Investment Fund">Investment Fund</option>
                              <option value="Pension Fund">Pension Fund</option>
                              <option value="Retirement Annuity">Retirement Annuity</option>
                              <option value="Employee Shares">Employee Shares</option>
                              <option value="Shares">Shares</option>
                              <option value="Long Term loans to Others">Long Term loans to Others</option>
                              <option value="Household Furniture">Household Furniture</option>
                              <option value="Jewelry">Jewelry</option>
                              <option value="Clothing & Attire">Clothing & Attire</option>
                              <option value="Machinery">Machinery</option>
                              <option value="Insurance Policies">Insurance Policies</option>
                              <option value="Inventory">Inventory</option>
                              <option value="Cash Balance">Cash Balance</option>
                              <option value="Short term loans to Other">Short term loans to Other</option>
                              <option value="Prepayments">Prepayments</option>
                              <option value="Deposits">Deposits</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 break-words">
                            <select
                              value={asset.type}
                              onChange={(e) => {
                                const updated = [...step2Assets];
                                updated[index].type = e.target.value as "Fixed Assets" | "Current Assets";
                                setStep2Assets(updated);
                              }}
                              className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                asset.type 
                                  ? 'border-gray-300 dark:border-gray-600' 
                                  : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                              }`}
                            >
                              <option value="">Select type...</option>
                              <option value="Fixed Assets">Fixed Assets</option>
                              <option value="Current Assets">Current Assets</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 break-words">
                            <input
                              type="text"
                              value={asset.name}
                              onChange={(e) => {
                                const updated = [...step2Assets];
                                updated[index].name = e.target.value;
                                setStep2Assets(updated);
                              }}
                              className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                asset.name.trim() 
                                  ? 'border-gray-300 dark:border-gray-600' 
                                  : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                              }`}
                              placeholder="e.g., Main House, Car, etc."
                            />
                          </td>
                          <td className="px-4 py-3 break-words">
                            <div className="relative">
                              <input
                                type="number"
                                value={asset.personal || ""}
                                onChange={(e) => {
                                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                                  const rounded = Math.round(value * 100) / 100;
                                  const updated = [...step2Assets];
                                  updated[index].personal = rounded;
                                  setStep2Assets(updated);
                                }}
                                onBlur={(e) => {
                                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                                  const rounded = Math.round(value * 100) / 100;
                                  const updated = [...step2Assets];
                                  updated[index].personal = rounded;
                                  setStep2Assets(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 break-words">
                            <div className="relative">
                              <input
                                type="number"
                                value={asset.spouse || ""}
                                onChange={(e) => {
                                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                                  const rounded = Math.round(value * 100) / 100;
                                  const updated = [...step2Assets];
                                  updated[index].spouse = rounded;
                                  setStep2Assets(updated);
                                }}
                                onBlur={(e) => {
                                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                                  const rounded = Math.round(value * 100) / 100;
                                  const updated = [...step2Assets];
                                  updated[index].spouse = rounded;
                                  setStep2Assets(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white break-words bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-1">
                              <span className="text-blue-600 dark:text-blue-400">N$</span>
                              <span>{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 break-words">
                            <input
                              type="number"
                              value={asset.points || ""}
                              onChange={(e) => {
                                const value = Math.max(25, Math.min(50, parseFloat(e.target.value) || 25));
                                const rounded = Math.round(value * 100) / 100;
                                const updated = [...step2Assets];
                                updated[index].points = rounded;
                                setStep2Assets(updated);
                              }}
                              onBlur={(e) => {
                                const value = Math.max(25, Math.min(50, parseFloat(e.target.value) || 25));
                                const rounded = Math.round(value * 100) / 100;
                                const updated = [...step2Assets];
                                updated[index].points = rounded;
                                setStep2Assets(updated);
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              placeholder="25"
                              min="25"
                              max="50"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-3 break-words">
                            <input
                              type="number"
                              value={asset.interestRate || ""}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const rounded = Math.round(value * 100) / 100;
                                const updated = [...step2Assets];
                                updated[index].interestRate = rounded;
                                setStep2Assets(updated);
                              }}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const rounded = Math.round(value * 100) / 100;
                                const updated = [...step2Assets];
                                updated[index].interestRate = rounded;
                                setStep2Assets(updated);
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              placeholder="0.00"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-3 break-words">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this asset?')) {
                                  setStep2Assets(step2Assets.filter((_, i) => i !== index));
                                }
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                              title="Delete asset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
            )}


            <button
              type="button"
              onClick={() => {
                setStep2Assets([
                  ...step2Assets,
                  {
                    id: `asset-step2-${Date.now()}-${Math.random()}`,
                    category: "House",
                    type: "Fixed Assets",
                    name: "",
                    personal: 0,
                    spouse: 0,
                    points: 25,
                    interestRate: 0,
                    editable: true,
                  },
                ]);
                // Scroll to bottom of table after adding
                setTimeout(() => {
                  const tableContainer = document.querySelector('.overflow-x-auto');
                  if (tableContainer) {
                    tableContainer.scrollTop = tableContainer.scrollHeight;
                  }
                }, 100);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] ${step2Assets.length === 0 ? 'text-lg py-4' : 'text-base py-3'}`}
            >
              <Plus className={`${step2Assets.length === 0 ? 'h-6 w-6' : 'h-5 w-5'}`} />
              {step2Assets.length === 0 ? 'Add Your First Asset' : 'Add Another Asset'}
            </button>

            {step2Assets.length > 0 && (
              <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-md">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Personal</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${step2Assets.reduce((sum, a) => sum + (a.personal || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Spouse</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${step2Assets.reduce((sum, a) => sum + (a.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-4 rounded-lg border-2 border-blue-500 dark:border-blue-600 shadow-lg">
                    <span className="text-white/90 dark:text-white/80 block text-xs mb-1 uppercase tracking-wide font-medium">Grand Total</span>
                    <span className="font-bold text-2xl text-white">
                      N${step2Assets.reduce((sum, a) => sum + (a.personal || 0) + (a.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Points</span>
                    <span className="font-semibold text-lg text-gray-900 dark:text-white">
                      {step2Assets.reduce((sum, a) => sum + (a.points || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Liabilities</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Add your liabilities and their details</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Fill in the required fields (Liabilities, Liability Type, Name) to add a liability</p>
            </div>

            {liabilities.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg border-2 border-dashed border-red-300 dark:border-gray-600 transition-all">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-3">
                    <Plus className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No liabilities added yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Start by adding your first liability below</p>
                <div className="text-xs text-gray-400 dark:text-gray-600 space-y-1">
                  <p>💡 Tip: You can add multiple liabilities</p>
                  <p>📝 Required fields: Liabilities, Liability Type, and Name</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {liabilities.length} {liabilities.length === 1 ? 'liability' : 'liabilities'} added
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Scroll horizontally to see all fields</p>
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                  <table className="w-full border-collapse min-w-[900px]">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Liabilities
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Liability Type
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[160px]">
                          <div className="flex items-center gap-1">
                            Name
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Personal (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Spouse (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Total (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Points
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Interest Rate (%)
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {liabilities.map((liability, index) => {
                        const total = (liability.personal || 0) + (liability.spouse || 0);
                        const isRowValid = liability.category && liability.type && liability.name.trim() !== "";
                        return (
                          <tr 
                            key={liability.id} 
                            className={`transition-colors ${
                              isRowValid 
                                ? 'hover:bg-red-50/50 dark:hover:bg-gray-700/50' 
                                : 'bg-yellow-50/30 dark:bg-yellow-900/10 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20'
                            }`}
                          >
                            <td className="px-4 py-3 break-words">
                              <select
                                value={liability.category}
                                onChange={(e) => {
                                  const updated = [...liabilities];
                                  updated[index].category = e.target.value as LiabilityCategory;
                                  setLiabilities(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  liability.category 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                              >
                                <option value="">Select liability...</option>
                                <option value="Equity">Equity</option>
                                <option value="House">House</option>
                                <option value="Farm">Farm</option>
                                <option value="Vehicles">Vehicles</option>
                                <option value="Long Term loans from Others">Long Term loans from Others</option>
                                <option value="Household Furniture">Household Furniture</option>
                                <option value="Jewelry">Jewelry</option>
                                <option value="Clothing & Attire">Clothing & Attire</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Overdraft">Overdraft</option>
                                <option value="Short term loans to Other">Short term loans to Other</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <select
                                value={liability.type}
                                onChange={(e) => {
                                  const updated = [...liabilities];
                                  updated[index].type = e.target.value as "Net Worth" | "Long Term Liabilities" | "Short Term Liabilities";
                                  setLiabilities(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  liability.type 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                              >
                                <option value="">Select type...</option>
                                <option value="Net Worth">Net Worth</option>
                                <option value="Long Term Liabilities">Long Term Liabilities</option>
                                <option value="Short Term Liabilities">Short Term Liabilities</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <input
                                type="text"
                                value={liability.name}
                                onChange={(e) => {
                                  const updated = [...liabilities];
                                  updated[index].name = e.target.value;
                                  setLiabilities(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  liability.name.trim() 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                                placeholder="e.g., Home Loan, Credit Card, etc."
                              />
                            </td>
                            <td className="px-4 py-3 break-words">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={liability.personal || ""}
                                  onChange={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...liabilities];
                                    updated[index].personal = rounded;
                                    setLiabilities(updated);
                                  }}
                                  onBlur={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...liabilities];
                                    updated[index].personal = rounded;
                                    setLiabilities(updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                  placeholder="0.01"
                                  min="0.01"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={liability.spouse || ""}
                                  onChange={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...liabilities];
                                    updated[index].spouse = rounded;
                                    setLiabilities(updated);
                                  }}
                                  onBlur={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...liabilities];
                                    updated[index].spouse = rounded;
                                    setLiabilities(updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                  placeholder="0.01"
                                  min="0.01"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white break-words bg-gray-50 dark:bg-gray-800/50">
                              <div className="flex items-center gap-1">
                                <span className="text-red-600 dark:text-red-400">N$</span>
                                <span>{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <select
                                value={liability.points || ""}
                                onChange={(e) => {
                                  const updated = [...liabilities];
                                  updated[index].points = parseFloat(e.target.value);
                                  setLiabilities(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select points...</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="75">75</option>
                                <option value="100">100</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <input
                                type="number"
                                value={liability.interestRate || ""}
                                onChange={(e) => {
                                  const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                  const rounded = Math.round(value * 100) / 100;
                                  const updated = [...liabilities];
                                  updated[index].interestRate = rounded;
                                  setLiabilities(updated);
                                }}
                                onBlur={(e) => {
                                  const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                  const rounded = Math.round(value * 100) / 100;
                                  const updated = [...liabilities];
                                  updated[index].interestRate = rounded;
                                  setLiabilities(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="0.01"
                                min="0.01"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3 break-words">
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this liability?')) {
                                    setLiabilities(liabilities.filter((_, i) => i !== index));
                                  }
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                                title="Delete liability"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setLiabilities([
                  ...liabilities,
                  {
                    id: `liability-${Date.now()}-${Math.random()}`,
                    category: "Equity",
                    type: "Net Worth",
                    name: "",
                    personal: 0.01,
                    spouse: 0.01,
                    points: 25,
                    interestRate: 0.01,
                    editable: true,
                  },
                ]);
                // Scroll to bottom of table after adding
                setTimeout(() => {
                  const tableContainer = document.querySelector('.overflow-x-auto');
                  if (tableContainer) {
                    tableContainer.scrollTop = tableContainer.scrollHeight;
                  }
                }, 100);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] ${liabilities.length === 0 ? 'text-lg py-4' : 'text-base py-3'}`}
            >
              <Plus className={`${liabilities.length === 0 ? 'h-6 w-6' : 'h-5 w-5'}`} />
              {liabilities.length === 0 ? 'Add Your First Liability' : 'Add Another Liability'}
            </button>

            {liabilities.length > 0 && (
              <div className="mt-4 p-5 bg-gradient-to-br from-red-50 via-orange-50 to-red-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800 shadow-md">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-red-100 dark:border-red-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Personal</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${liabilities.reduce((sum, l) => sum + (l.personal || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-red-100 dark:border-red-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Spouse</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${liabilities.reduce((sum, l) => sum + (l.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-700 dark:to-orange-700 p-4 rounded-lg border-2 border-red-500 dark:border-red-600 shadow-lg">
                    <span className="text-white/90 dark:text-white/80 block text-xs mb-1 uppercase tracking-wide font-medium">Grand Total</span>
                    <span className="font-bold text-2xl text-white">
                      N${liabilities.reduce((sum, l) => sum + (l.personal || 0) + (l.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-red-100 dark:border-red-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Points</span>
                    <span className="font-semibold text-lg text-gray-900 dark:text-white">
                      {liabilities.reduce((sum, l) => sum + (l.points || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Income</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Add your income sources and their details</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Fill in the required fields (Income, Income Type, Name) to add an income source</p>
            </div>

            {incomes.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg border-2 border-dashed border-green-300 dark:border-gray-600 transition-all">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
                    <Plus className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No income sources added yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Start by adding your first income source below</p>
                <div className="text-xs text-gray-400 dark:text-gray-600 space-y-1">
                  <p>💡 Tip: You can add multiple income sources</p>
                  <p>📝 Required fields: Income, Income Type, and Name</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {incomes.length} {incomes.length === 1 ? 'income source' : 'income sources'} added
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Scroll horizontally to see all fields</p>
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                  <table className="w-full border-collapse min-w-[900px]">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Income
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Income Type
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[160px]">
                          <div className="flex items-center gap-1">
                            Name
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Personal (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Spouse (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Total (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Points
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {incomes.map((income, index) => {
                        const total = (income.personal || 0) + (income.spouse || 0);
                        const isRowValid = income.category && income.type && income.name.trim() !== "";
                        return (
                          <tr 
                            key={income.id} 
                            className={`transition-colors ${
                              isRowValid 
                                ? 'hover:bg-green-50/50 dark:hover:bg-gray-700/50' 
                                : 'bg-yellow-50/30 dark:bg-yellow-900/10 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20'
                            }`}
                          >
                            <td className="px-4 py-3 break-words">
                              <select
                                value={income.category}
                                onChange={(e) => {
                                  const updated = [...incomes];
                                  updated[index].category = e.target.value as IncomeCategory;
                                  setIncomes(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  income.category 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                              >
                                <option value="">Select income...</option>
                                <option value="Salary">Salary</option>
                                <option value="Rental Income">Rental Income</option>
                                <option value="Bonus">Bonus</option>
                                <option value="Side Hustle">Side Hustle</option>
                                <option value="Board Fees">Board Fees</option>
                                <option value="Commission">Commission</option>
                                <option value="Business Income">Business Income</option>
                                <option value="Pension">Pension</option>
                                <option value="Retirement Annuities">Retirement Annuities</option>
                                <option value="Dividends">Dividends</option>
                                <option value="Interest Income">Interest Income</option>
                                <option value="Sales of Goods">Sales of Goods</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <select
                                value={income.type}
                                onChange={(e) => {
                                  const updated = [...incomes];
                                  updated[index].type = e.target.value as "Fixed" | "Variable";
                                  setIncomes(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  income.type 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                              >
                                <option value="">Select type...</option>
                                <option value="Fixed">Fixed</option>
                                <option value="Variable">Variable</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <input
                                type="text"
                                value={income.name}
                                onChange={(e) => {
                                  const updated = [...incomes];
                                  updated[index].name = e.target.value;
                                  setIncomes(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  income.name.trim() 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                                placeholder="e.g., Monthly Salary, Rental Property, etc."
                              />
                            </td>
                            <td className="px-4 py-3 break-words">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={income.personal || ""}
                                  onChange={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...incomes];
                                    updated[index].personal = rounded;
                                    setIncomes(updated);
                                  }}
                                  onBlur={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...incomes];
                                    updated[index].personal = rounded;
                                    setIncomes(updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                  placeholder="0.01"
                                  min="0.01"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={income.spouse || ""}
                                  onChange={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...incomes];
                                    updated[index].spouse = rounded;
                                    setIncomes(updated);
                                  }}
                                  onBlur={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...incomes];
                                    updated[index].spouse = rounded;
                                    setIncomes(updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                  placeholder="0.01"
                                  min="0.01"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white break-words bg-gray-50 dark:bg-gray-800/50">
                              <div className="flex items-center gap-1">
                                <span className="text-green-600 dark:text-green-400">N$</span>
                                <span>{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <select
                                value={income.points || ""}
                                onChange={(e) => {
                                  const updated = [...incomes];
                                  updated[index].points = parseFloat(e.target.value);
                                  setIncomes(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select points...</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="75">75</option>
                                <option value="100">100</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this income source?')) {
                                    setIncomes(incomes.filter((_, i) => i !== index));
                                  }
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                                title="Delete income source"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIncomes([
                  ...incomes,
                  {
                    id: `income-${Date.now()}-${Math.random()}`,
                    category: "Salary",
                    type: "Fixed",
                    name: "",
                    personal: 0.01,
                    spouse: 0.01,
                    points: 25,
                    editable: true,
                  },
                ]);
                // Scroll to bottom of table after adding
                setTimeout(() => {
                  const tableContainer = document.querySelector('.overflow-x-auto');
                  if (tableContainer) {
                    tableContainer.scrollTop = tableContainer.scrollHeight;
                  }
                }, 100);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] ${incomes.length === 0 ? 'text-lg py-4' : 'text-base py-3'}`}
            >
              <Plus className={`${incomes.length === 0 ? 'h-6 w-6' : 'h-5 w-5'}`} />
              {incomes.length === 0 ? 'Add Your First Income Source' : 'Add Another Income Source'}
            </button>

            {incomes.length > 0 && (
              <div className="mt-4 p-5 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-md">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-green-100 dark:border-green-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Personal</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${incomes.reduce((sum, i) => sum + (i.personal || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-green-100 dark:border-green-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Spouse</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${incomes.reduce((sum, i) => sum + (i.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 p-4 rounded-lg border-2 border-green-500 dark:border-green-600 shadow-lg">
                    <span className="text-white/90 dark:text-white/80 block text-xs mb-1 uppercase tracking-wide font-medium">Grand Total</span>
                    <span className="font-bold text-2xl text-white">
                      N${incomes.reduce((sum, i) => sum + (i.personal || 0) + (i.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-green-100 dark:border-green-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Points</span>
                    <span className="font-semibold text-lg text-gray-900 dark:text-white">
                      {incomes.reduce((sum, i) => sum + (i.points || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Expenses</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Add your expenses and their details</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Fill in the required fields (Expenses, Expense Type, Name) to add an expense</p>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg border-2 border-dashed border-purple-300 dark:border-gray-600 transition-all">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-3">
                    <Plus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No expenses added yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Start by adding your first expense below</p>
                <div className="text-xs text-gray-400 dark:text-gray-600 space-y-1">
                  <p>💡 Tip: You can add multiple expenses</p>
                  <p>📝 Required fields: Expenses, Expense Type, and Name</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} added
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Scroll horizontally to see all fields</p>
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                  <table className="w-full border-collapse min-w-[900px]">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Expenses
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[130px]">
                          <div className="flex items-center gap-1">
                            Expense Type
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[160px]">
                          <div className="flex items-center gap-1">
                            Name
                            <span className="text-red-500">*</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Personal (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Spouse (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[110px]">
                          Total (N$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Points
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600 min-w-[90px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {expenses.map((expense, index) => {
                        const total = (expense.personal || 0) + (expense.spouse || 0);
                        const isRowValid = expense.category && expense.type && expense.name.trim() !== "";
                        return (
                          <tr 
                            key={expense.id} 
                            className={`transition-colors ${
                              isRowValid 
                                ? 'hover:bg-purple-50/50 dark:hover:bg-gray-700/50' 
                                : 'bg-yellow-50/30 dark:bg-yellow-900/10 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20'
                            }`}
                          >
                            <td className="px-4 py-3 break-words">
                              <select
                                value={expense.category}
                                onChange={(e) => {
                                  const updated = [...expenses];
                                  updated[index].category = e.target.value as ExpenseCategory;
                                  setExpenses(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  expense.category 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                              >
                                <option value="">Select expense...</option>
                                <option value="Company Pension">Company Pension</option>
                                <option value="Tax">Tax</option>
                                <option value="Medical Aid">Medical Aid</option>
                                <option value="Investments">Investments</option>
                                <option value="Retirement Annuity">Retirement Annuity</option>
                                <option value="Long Term Insurance">Long Term Insurance</option>
                                <option value="Short Term Insurance">Short Term Insurance</option>
                                <option value="Funeral Insurance">Funeral Insurance</option>
                                <option value="Bank Charges">Bank Charges</option>
                                <option value="Personal Loan Payments">Personal Loan Payments</option>
                                <option value="Home Loan Payments">Home Loan Payments</option>
                                <option value="Vehicle Loan Payments">Vehicle Loan Payments</option>
                                <option value="Credit Card Payments">Credit Card Payments</option>
                                <option value="Rental Expenses">Rental Expenses</option>
                                <option value="Water & Electricity">Water & Electricity</option>
                                <option value="Rates and Taxes">Rates and Taxes</option>
                                <option value="Groceries">Groceries</option>
                                <option value="Dining Out">Dining Out</option>
                                <option value="Lunch">Lunch</option>
                                <option value="Subscriptions">Subscriptions</option>
                                <option value="Clothing Accounts">Clothing Accounts</option>
                                <option value="Fuel & Transport Expenses">Fuel & Transport Expenses</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Domestic Staff Salary">Domestic Staff Salary</option>
                                <option value="Garden Staff Salary">Garden Staff Salary</option>
                                <option value="Kids: School Fees">Kids: School Fees</option>
                                <option value="Kids: After Care">Kids: After Care</option>
                                <option value="Kids: Extra Mural Activities">Kids: Extra Mural Activities</option>
                                <option value="Kids: Maintenance">Kids: Maintenance</option>
                                <option value="Maintenance: Car">Maintenance: Car</option>
                                <option value="Maintenance: House">Maintenance: House</option>
                                <option value="Armed Response">Armed Response</option>
                                <option value="Internet/Data">Internet/Data</option>
                                <option value="Airtime">Airtime</option>
                                <option value="Family: Extended">Family: Extended</option>
                                <option value="Farm Expenses">Farm Expenses</option>
                                <option value="Donations">Donations</option>
                                <option value="Legal Expense">Legal Expense</option>
                                <option value="Educations">Educations</option>
                                <option value="Medicine">Medicine</option>
                                <option value="Administration">Administration</option>
                                <option value="Vacations">Vacations</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <select
                                value={expense.type}
                                onChange={(e) => {
                                  const updated = [...expenses];
                                  updated[index].type = e.target.value as "Fixed" | "Variable";
                                  setExpenses(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  expense.type 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                              >
                                <option value="">Select type...</option>
                                <option value="Fixed">Fixed</option>
                                <option value="Variable">Variable</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <input
                                type="text"
                                value={expense.name}
                                onChange={(e) => {
                                  const updated = [...expenses];
                                  updated[index].name = e.target.value;
                                  setExpenses(updated);
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                                  expense.name.trim() 
                                    ? 'border-gray-300 dark:border-gray-600' 
                                    : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                }`}
                                placeholder="e.g., Monthly Groceries, Car Insurance, etc."
                              />
                            </td>
                            <td className="px-4 py-3 break-words">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={expense.personal || ""}
                                  onChange={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...expenses];
                                    updated[index].personal = rounded;
                                    setExpenses(updated);
                                  }}
                                  onBlur={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...expenses];
                                    updated[index].personal = rounded;
                                    setExpenses(updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                  placeholder="0.01"
                                  min="0.01"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={expense.spouse || ""}
                                  onChange={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...expenses];
                                    updated[index].spouse = rounded;
                                    setExpenses(updated);
                                  }}
                                  onBlur={(e) => {
                                    const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                                    const rounded = Math.round(value * 100) / 100;
                                    const updated = [...expenses];
                                    updated[index].spouse = rounded;
                                    setExpenses(updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                  placeholder="0.01"
                                  min="0.01"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white break-words bg-gray-50 dark:bg-gray-800/50">
                              <div className="flex items-center gap-1">
                                <span className="text-purple-600 dark:text-purple-400">N$</span>
                                <span>{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <select
                                value={expense.points || ""}
                                onChange={(e) => {
                                  const updated = [...expenses];
                                  updated[index].points = parseFloat(e.target.value);
                                  setExpenses(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select points...</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="75">75</option>
                                <option value="100">100</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 break-words">
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this expense?')) {
                                    setExpenses(expenses.filter((_, i) => i !== index));
                                  }
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                                title="Delete expense"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setExpenses([
                  ...expenses,
                  {
                    id: `expense-${Date.now()}-${Math.random()}`,
                    category: "Groceries",
                    type: "Variable",
                    name: "",
                    personal: 0.01,
                    spouse: 0.01,
                    points: 25,
                    editable: true,
                  },
                ]);
                // Scroll to bottom of table after adding
                setTimeout(() => {
                  const tableContainer = document.querySelector('.overflow-x-auto');
                  if (tableContainer) {
                    tableContainer.scrollTop = tableContainer.scrollHeight;
                  }
                }, 100);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] ${expenses.length === 0 ? 'text-lg py-4' : 'text-base py-3'}`}
            >
              <Plus className={`${expenses.length === 0 ? 'h-6 w-6' : 'h-5 w-5'}`} />
              {expenses.length === 0 ? 'Add Your First Expense' : 'Add Another Expense'}
            </button>

            {expenses.length > 0 && (
              <div className="mt-4 p-5 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-50 dark:from-purple-900/20 dark:via-violet-900/20 dark:to-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800 shadow-md">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Personal</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${expenses.reduce((sum, e) => sum + (e.personal || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Spouse</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      N${expenses.reduce((sum, e) => sum + (e.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-700 dark:to-violet-700 p-4 rounded-lg border-2 border-purple-500 dark:border-purple-600 shadow-lg">
                    <span className="text-white/90 dark:text-white/80 block text-xs mb-1 uppercase tracking-wide font-medium">Grand Total</span>
                    <span className="font-bold text-2xl text-white">
                      N${expenses.reduce((sum, e) => sum + (e.personal || 0) + (e.spouse || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2 bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                    <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Total Points</span>
                    <span className="font-semibold text-lg text-gray-900 dark:text-white">
                      {expenses.reduce((sum, e) => sum + (e.points || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Monthly Saving Goal</h2>
              <p className="text-gray-600 dark:text-gray-400">What were your last expenses?</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Expenses (N$)
              </label>
              <input
                type="number"
                value={formData.lastExpenses || ""}
                onChange={(e) => updateFormData("lastExpenses", parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Monthly Saving Goal</h2>
              <p className="text-gray-600 dark:text-gray-400">What is your monthly saving goal?</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monthly Saving Goal (N$)
              </label>
              <input
                type="number"
                value={formData.savingGoals !== undefined && formData.savingGoals !== null ? formData.savingGoals : ""}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === "") {
                    updateFormData("savingGoals", undefined);
                  } else {
                    const numValue = parseFloat(inputValue);
                    if (!isNaN(numValue) && isFinite(numValue)) {
                      updateFormData("savingGoals", Math.max(0, numValue));
                    }
                  }
                }}
                onBlur={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === "") {
                    updateFormData("savingGoals", undefined);
                  } else {
                    const numValue = parseFloat(inputValue);
                    if (!isNaN(numValue) && isFinite(numValue)) {
                      updateFormData("savingGoals", Math.max(0, numValue));
                    } else {
                      updateFormData("savingGoals", undefined);
                    }
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`w-full ${currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6 ? 'max-w-7xl' : 'max-w-2xl'} mx-auto`}>
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

        {/* Step Content */}
        <div className={`${currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6 ? 'min-h-[500px]' : 'min-h-[300px]'} ${currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6 ? 'flex items-start w-full' : 'flex items-center justify-center'} py-10`}>
          <div className="w-full">
            {renderStep()}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
              </>
            ) : (
              <>
                  Next
                  <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Completing...
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

        {/* Show Google Login only on step 1 - Commented out for MVP */}
        {/* {currentStep === 1 && (
          <>
            <div className="mt-6">
              <GoogleLoginButton />
            </div>
        )} */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
