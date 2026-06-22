"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { storage } from "@/lib/storage";
import { syncClientToCrm } from "@/lib/crmSync";
import { useAuth } from "@/contexts/AuthContext";
import { Save, User, Mail, Phone, CheckCircle, AlertCircle } from "lucide-react";

export default function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedProfile = await storage.getProfile();
      if (cancelled) return;
      if (savedProfile) {
        setProfile(savedProfile);
      } else {
        const defaultProfile: UserProfile = {
          id: user?.userId || "1",
          name: "",
          email: user?.email || "",
          monthlyIncome: 0,
          createdAt: new Date().toISOString(),
        };
        setProfile(defaultProfile);
      }
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setSyncWarning(null);
    await storage.saveProfile(profile);

      // CRM Sync
    try {
      console.log('[ProfileForm] Calling syncClientToCrm (profile-only)...');
      const crmSyncResult = await syncClientToCrm(
        ({
          syncStage: "onboarding",
          profile: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            workNumber: profile.workNumber,
            homeNumber: profile.homeNumber,
            workEmail: profile.workEmail,
            monthlyIncome: profile.monthlyIncome,
            savingsGoal: profile.savingsGoal,
            capital: profile.capital,
            debts: profile.debts,
            lastIncome: profile.lastIncome,
            lastExpenses: profile.lastExpenses,
            createdAt: profile.createdAt,
            dateOfBirth: profile.dateOfBirth,
            dateOfMarriage: profile.dateOfMarriage,
            idNumber: profile.idNumber,
            taxNumber: profile.taxNumber,
            occupation: profile.occupation,
            employer: profile.employer,
            highestQualification: profile.highestQualification,
            gender: profile.gender,
            maritalStatus: profile.maritalStatus,
            sourceOfWealth: profile.sourceOfWealth,
            industryClassification: profile.industryClassification,
            bankAccountHolder: profile.bankAccountHolder,
            bankCode: profile.bankCode,
            bankName: profile.bankName,
            bankBranchCode: profile.bankBranchCode,
            bankAccountType: profile.bankAccountType,
            bankAccountNumber: profile.bankAccountNumber,
          },
        } as any),
        { force: true, profileOnly: true }
      );

      console.log('[ProfileForm] CRM sync result:', crmSyncResult);

      if (!crmSyncResult.success) {
        console.warn('[ProfileForm] CRM sync failed:', crmSyncResult.message);
        setSyncWarning(crmSyncResult.message || "Profile saved, but CRM sync failed.");
      } else {
        console.log('[ProfileForm] CRM sync successful!');
      }
    } catch (error) {
      console.error('[ProfileForm] CRM sync error:', error);
      setSyncWarning("Profile saved, but CRM sync failed.");
    }

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChange = (field: keyof UserProfile, value: string | number) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <p className="text-red-800 dark:text-red-200">Error loading profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-800 dark:text-green-200 font-medium">Profile saved successfully!</p>
        </div>
      )}
      {syncWarning && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200 font-medium">{syncWarning}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/5 rounded-xl p-6 border border-blue-100 dark:border-blue-900/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Basic Information
          </h3>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all"
                placeholder="Enter your full name"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">How we'll address you in the app</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for login and important notifications</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="+264 81 123 4567"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For account recovery and support</p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-50 dark:from-purple-900/10 dark:to-purple-900/5 rounded-xl p-6 border border-purple-100 dark:border-purple-900/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            Account Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-purple-100 dark:border-purple-900/30">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200">
                Active
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          <Save className="h-5 w-5" />
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>Your financial information is secured and encrypted. Only you can access your personal data.</span>
        </p>
      </div>
    </div>
  );
}

