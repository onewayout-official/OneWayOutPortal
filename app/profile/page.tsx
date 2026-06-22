"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";
import { syncClientToCrm } from "@/lib/crmSync";
import type { CrmProfileExtraValue, UserProfile } from "@/types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle,
  FileCheck2,
  IdCard,
  Landmark,
  Loader2,
  MapPin,
  Save,
  Settings,
  User,
} from "lucide-react";

type TabId = "personal" | "crm" | "contact" | "identity" | "work" | "compliance" | "banking";
type CrmFieldType = "text" | "number" | "date" | "datetime-local" | "url" | "textarea" | "select" | "checkbox";

interface CrmField {
  key: string;
  label: string;
  type?: CrmFieldType;
  options?: Array<{ value: string; label: string }>;
}

interface CrmOption {
  value: string;
  label: string;
}

const TABS: Array<{ id: TabId; label: string; icon: typeof User }> = [
  { id: "personal", label: "Personal", icon: User },
  { id: "crm", label: "CRM Admin", icon: Settings },
  { id: "contact", label: "Contact & Address", icon: MapPin },
  { id: "identity", label: "ID Info", icon: IdCard },
  { id: "work", label: "Work & Wealth", icon: BriefcaseBusiness },
  { id: "compliance", label: "Compliance", icon: FileCheck2 },
  { id: "banking", label: "Banking", icon: Landmark },
];

const maritalStatusOptions: Array<{ value: NonNullable<UserProfile["maritalStatus"]>; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "unmarried", label: "Unmarried" },
  { value: "married_in_cop", label: "Married in COP" },
  { value: "married_out_cop_w_accrual", label: "Married out of COP with accrual" },
  { value: "married_out_cop", label: "Married out of COP" },
  { value: "common_law", label: "Common law" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "married_unknown", label: "Married, regime unknown" },
];

const sourceOfWealthOptions: Array<{ value: NonNullable<UserProfile["sourceOfWealth"]>; label: string }> = [
  { value: "accumulated_savings", label: "Accumulated savings" },
  { value: "sale_of_assets", label: "Sale of assets" },
  { value: "investment_returns", label: "Investment returns" },
  { value: "inheritance_donations", label: "Inheritance / donations" },
  { value: "court_orders_settlements", label: "Court orders / settlements" },
  { value: "legitimate_winnings", label: "Legitimate winnings" },
];

const industryOptions: Array<{ value: NonNullable<UserProfile["industryClassification"]>; label: string }> = [
  { value: "accounting_auditing", label: "Accounting / auditing" },
  { value: "agriculture_farming", label: "Agriculture / farming" },
  { value: "cash_forex_crypto", label: "Cash / forex / crypto" },
  { value: "charitable_religious", label: "Charitable / religious" },
  { value: "construction_real_estate", label: "Construction / real estate" },
  { value: "education", label: "Education" },
  { value: "engineering", label: "Engineering" },
  { value: "financial_services", label: "Financial services" },
  { value: "government_military", label: "Government / military" },
  { value: "hospitality_sport_entertainment", label: "Hospitality / sport / entertainment" },
  { value: "legal_practitioners", label: "Legal practitioners" },
  { value: "medical_healthcare", label: "Medical / healthcare" },
  { value: "retail_manufacturing_industrial", label: "Retail / manufacturing / industrial" },
  { value: "retiree", label: "Retiree" },
  { value: "technology", label: "Technology" },
  { value: "transport_logistics", label: "Transport / logistics" },
  { value: "unemployed", label: "Unemployed" },
];

const yesNoStatusOptions = [
  { value: "not_checked", label: "Not checked" },
  { value: "clear", label: "Clear" },
  { value: "match_found", label: "Match found" },
];

const bankOptions = [
  { value: 0, label: "Internal" },
  { value: 1, label: "Absa Bank" },
  { value: 2, label: "African Bank" },
  { value: 3, label: "Albaraka Bank" },
  { value: 4, label: "Bank Of Athens" },
  { value: 5, label: "Bank Windhoek" },
  { value: 6, label: "Bidvest Bank" },
  { value: 7, label: "BNP Paribas" },
  { value: 8, label: "BOE Bank Limited" },
  { value: 9, label: "Cape Of Good Hope Bank" },
  { value: 10, label: "Capitec Bank" },
  { value: 11, label: "Citibank N.A." },
  { value: 46, label: "Discovery Bank Limited" },
  { value: 12, label: "Fidelity Bank Ltd" },
  { value: 13, label: "Finbond Mutual Bank" },
  { value: 14, label: "First National Bank" },
  { value: 45, label: "First National Bank Namibia" },
  { value: 15, label: "Grindrod Bank" },
  { value: 16, label: "Habib Overseas Bank Ltd" },
  { value: 17, label: "HBZ Bank" },
  { value: 18, label: "HSBC Bank" },
  { value: 19, label: "Investec Bank Ltd" },
  { value: 20, label: "Ithala (Absa)" },
  { value: 21, label: "JP Morgan Bank" },
  { value: 22, label: "Meeg Bank" },
  { value: 23, label: "Mercantile Bank" },
  { value: 24, label: "Nedbank" },
  { value: 25, label: "Nedbank Bond Accounts" },
  { value: 26, label: "Nedbank Lesotho Ltd" },
  { value: 27, label: "Nedbank Namibia" },
  { value: 28, label: "Nedbank Swaziland Ltd" },
  { value: 29, label: "Olympus Mobile Bank" },
  { value: 30, label: "Peoples Bank Ltd Inc Nbs" },
  { value: 31, label: "PEP Bank" },
  { value: 32, label: "Permanent Bank" },
  { value: 33, label: "Permanent Bank Current Ac" },
  { value: 34, label: "Post Office" },
  { value: 1000, label: "RMB" },
  { value: 35, label: "Sasfin Bank" },
  { value: 36, label: "Standard Bank Lesotho" },
  { value: 37, label: "Standard Bank Namibia" },
  { value: 38, label: "Standard Bank S.A." },
  { value: 39, label: "Standard Bank Swaziland" },
  { value: 40, label: "Standard Chartered" },
  { value: 41, label: "State Bank Of India" },
  { value: 47, label: "Tyme Bank" },
  { value: 42, label: "U Bank" },
  { value: 43, label: "Unibank" },
  { value: 44, label: "VBS Mutual Bank" },
];

const CRM_FIELDS: Record<"crm" | "contact" | "compliance", CrmField[]> = {
  crm: [
    { key: "client_category", label: "Client Category ID", type: "number" },
    { key: "client_status", label: "Client Status ID", type: "number" },
    { key: "risk_level", label: "Client Risk Level ID", type: "number" },
    { key: "adviser", label: "Adviser ID", type: "text" },
    { key: "adviser_1", label: "Adviser 1 ID", type: "number" },
    { key: "adviser_2", label: "Adviser 2 ID", type: "number" },
    { key: "adviser_3", label: "Adviser 3 ID", type: "number" },
    { key: "portal_settings", label: "Portal Settings ID", type: "number" },
    { key: "language", label: "Language", type: "select", options: [{ value: "english", label: "English" }, { value: "afrikaans", label: "Afrikaans" }] },
    { key: "activate_user", label: "Activate Portal User", type: "checkbox" },
    { key: "primary_family_member", label: "Primary Family Member", type: "checkbox" },
    { key: "weekly_notes", label: "Weekly Notes", type: "checkbox" },
    { key: "topical_notes", label: "Topical Notes", type: "checkbox" },
    { key: "portfolio_notes", label: "Portfolio Notes", type: "checkbox" },
    { key: "send_sms", label: "Allow SMS Messages", type: "checkbox" },
    { key: "send_email", label: "Allow System Emails", type: "checkbox" },
    { key: "agreed_ongoing_fee", label: "Agreed Ongoing Fee", type: "number" },
    { key: "plan_fee", label: "Plan Fee", type: "number" },
  ],
  contact: [
    { key: "physical_address", label: "Physical Address", type: "textarea" },
    { key: "physical_address_city", label: "Physical Address City ID", type: "number" },
    { key: "physical_address_state_province", label: "Physical Address State / Province ID", type: "number" },
    { key: "physical_address_code", label: "Physical Address Code" },
    { key: "postal_same_as_physical", label: "Postal same as physical", type: "checkbox" },
    { key: "postal_address", label: "Postal Address", type: "textarea" },
    { key: "postal_address_city", label: "Postal Address City ID", type: "number" },
    { key: "postal_address_state_province", label: "Postal Address State / Province ID", type: "number" },
    { key: "postal_address_code", label: "Postal Address Code" },
    { key: "work_address", label: "Work Address", type: "textarea" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "url" },
    { key: "facebook_url", label: "Facebook URL", type: "url" },
    { key: "twitter_url", label: "Twitter URL", type: "url" },
    { key: "instagram_url", label: "Instagram URL", type: "url" },
  ],
  compliance: [
    { key: "notes", label: "Notes", type: "textarea" },
    { key: "talking_points", label: "Talking Points", type: "textarea" },
    { key: "sanctions", label: "Sanctions", type: "select", options: yesNoStatusOptions },
    { key: "sanctions_first_checked_on", label: "Sanctions First Checked On", type: "datetime-local" },
    { key: "sanctions_checked_on", label: "Sanctions Checked On", type: "datetime-local" },
    { key: "pep_status", label: "PEP Status", type: "select", options: yesNoStatusOptions },
    { key: "pep_checked_on", label: "PEP Checked On", type: "datetime-local" },
    { key: "adverse_media_status", label: "Adverse Media Status", type: "select", options: yesNoStatusOptions },
    { key: "adverse_media_checked_on", label: "Adverse Media Checked On", type: "datetime-local" },
    { key: "suspicious_activity_status", label: "Suspicious Activity Status", type: "select", options: [{ value: "unknown", label: "Unknown" }, { value: "clear", label: "Clear" }, { value: "yes", label: "Yes" }] },
    { key: "suspicious_activity_notes", label: "Suspicious Activity Notes", type: "textarea" },
    { key: "meeting_method", label: "Meeting Method", type: "select", options: [{ value: "in_person", label: "In person" }, { value: "hybrid", label: "Hybrid" }, { value: "virtual", label: "Virtual" }] },
    { key: "verified_physical_address", label: "Verified Physical Address", type: "textarea" },
    { key: "physical_address_verified", label: "Physical Address Verified", type: "select", options: [{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }] },
  ],
};

function emptyProfile(userId?: string, email?: string): UserProfile {
  return {
    id: userId || "1",
    name: "",
    email: email || "",
    phone: "",
    monthlyIncome: 0,
    createdAt: new Date().toISOString(),
    maritalStatus: "unknown",
    crmProfileData: {},
  };
}

function toNumberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("personal");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [adviserOptions, setAdviserOptions] = useState<CrmOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const savedProfile = await storage.getProfile();
      if (cancelled) return;
      setProfile(savedProfile ? { ...emptyProfile(user?.userId, user?.email), ...savedProfile, crmProfileData: savedProfile.crmProfileData ?? {} } : emptyProfile(user?.userId, user?.email));
      setIsLoading(false);
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function loadAdvisers() {
      try {
        const response = await fetch("/api/crm/options?type=advisers");
        const data = (await response.json()) as { options?: CrmOption[] };
        if (!cancelled) setAdviserOptions(Array.isArray(data.options) ? data.options : []);
      } catch {
        if (!cancelled) setAdviserOptions([]);
      }
    }
    loadAdvisers();
    return () => { cancelled = true; };
  }, []);

  const activeTabIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const isFirstTab = activeTabIndex === 0;
  const isLastTab = activeTabIndex === TABS.length - 1;

  const updateProfile = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setProfile((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateNumber = (field: keyof UserProfile, value: string) => {
    updateProfile(field, toNumberOrUndefined(value) as never);
  };

  const updateCrmField = (key: string, value: CrmProfileExtraValue | "") => {
    setProfile((current) => {
      if (!current) return current;
      const crmProfileData = { ...(current.crmProfileData ?? {}) };
      if (value === "") delete crmProfileData[key];
      else crmProfileData[key] = value;
      return { ...current, crmProfileData };
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSyncWarning(null);
    await storage.saveProfile(profile);
    try {
      const crmSyncResult = await syncClientToCrm(
        { syncStage: "onboarding", profile, onboarding: { income: [], expenses: [], assets: [], liabilities: [] } },
        { force: true, profileOnly: true }
      );
      console.log("[ProfilePage] CRM sync result:", crmSyncResult);
      if (!crmSyncResult.success) setSyncWarning(crmSyncResult.message || "Profile saved, but CRM update failed.");
    } catch (error) {
      console.error("[ProfilePage] CRM sync error:", error);
      setSyncWarning("Profile saved, but CRM update failed.");
    } finally {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const inputCls = "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all";
  const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";

  const renderCrmField = (field: CrmField) => {
    if (!profile) return null;
    const value = profile.crmProfileData?.[field.key];
    const isAdviserField = ["adviser", "adviser_1", "adviser_2", "adviser_3"].includes(field.key);
    const fieldType = isAdviserField ? "select" : field.type ?? "text";
    const options = isAdviserField ? adviserOptions : field.options;
    if (fieldType === "checkbox") {
      return (
        <label key={field.key} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => updateCrmField(field.key, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{field.label}</span>
        </label>
      );
    }
    if (fieldType === "select") {
      return (
        <div key={field.key}>
          <label className={labelCls}>{field.label}</label>
          <select className={inputCls} value={String(value ?? "")} onChange={(e) => updateCrmField(field.key, e.target.value)}>
            <option value="">Select</option>
            {options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      );
    }
    if (fieldType === "textarea") {
      return (
        <div key={field.key} className="md:col-span-2">
          <label className={labelCls}>{field.label}</label>
          <textarea className={`${inputCls} min-h-28 resize-y`} value={String(value ?? "")} onChange={(e) => updateCrmField(field.key, e.target.value)} />
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className={labelCls}>{field.label}</label>
        <input className={inputCls} type={fieldType} min={fieldType === "number" ? 0 : undefined} value={String(value ?? "")} onChange={(e) => updateCrmField(field.key, fieldType === "number" ? toNumberOrUndefined(e.target.value) ?? "" : e.target.value)} />
      </div>
    );
  };

  const renderCrmFields = (tab: keyof typeof CRM_FIELDS) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{CRM_FIELDS[tab].map(renderCrmField)}</div>
  );

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">Error loading profile</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your CRM client profile information.</p>
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-200 font-medium">{syncWarning ? "Profile saved locally." : "Profile saved and synced to CRM."}</p>
            </div>
          )}
          {syncWarning && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <p className="text-amber-800 dark:text-amber-200 font-medium">{syncWarning}</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 min-w-40 flex-1 justify-center px-4 py-4 text-sm font-semibold transition-all ${activeTab === tab.id ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}>
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              {activeTab === "personal" && (
                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelCls}>Full Name *</label><input className={inputCls} value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} required /></div>
                    <div><label className={labelCls}>Preferred / First Name</label><input className={inputCls} value={profile.firstName || ""} onChange={(e) => updateProfile("firstName", e.target.value)} /></div>
                    <div><label className={labelCls}>Surname</label><input className={inputCls} value={profile.lastName || ""} onChange={(e) => updateProfile("lastName", e.target.value)} /></div>
                    <div><label className={labelCls}>Initials</label><input className={inputCls} value={profile.initials || ""} onChange={(e) => updateProfile("initials", e.target.value)} /></div>
                    <div><label className={labelCls}>Primary Email *</label><input className={inputCls} type="email" value={profile.email} onChange={(e) => updateProfile("email", e.target.value)} required /></div>
                    <div><label className={labelCls}>Mobile Number</label><input className={inputCls} type="tel" value={profile.phone || ""} onChange={(e) => updateProfile("phone", e.target.value)} /></div>
                    <div><label className={labelCls}>Secondary / Work Email</label><input className={inputCls} type="email" value={profile.workEmail || ""} onChange={(e) => updateProfile("workEmail", e.target.value)} /></div>
                    <div><label className={labelCls}>Work Number</label><input className={inputCls} type="tel" value={profile.workNumber || ""} onChange={(e) => updateProfile("workNumber", e.target.value)} /></div>
                    <div><label className={labelCls}>Home Number</label><input className={inputCls} type="tel" value={profile.homeNumber || ""} onChange={(e) => updateProfile("homeNumber", e.target.value)} /></div>
                  </div>
                </section>
              )}

              {activeTab === "crm" && <section className="space-y-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white">CRM Admin Fields</h2>{renderCrmFields("crm")}</section>}
              {activeTab === "contact" && <section className="space-y-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white">Contact & Address</h2>{renderCrmFields("contact")}</section>}

              {activeTab === "identity" && (
                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">ID Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelCls}>ID Number</label><input className={inputCls} value={profile.idNumber || ""} onChange={(e) => updateProfile("idNumber", e.target.value)} /></div>
                    {renderCrmField({ key: "id_full_name", label: "ID Full Name" })}
                    <div><label className={labelCls}>Tax Number</label><input className={inputCls} value={profile.taxNumber || ""} onChange={(e) => updateProfile("taxNumber", e.target.value)} /></div>
                    <div><label className={labelCls}>Date of Birth</label><input className={inputCls} type="date" value={profile.dateOfBirth || ""} onChange={(e) => updateProfile("dateOfBirth", e.target.value)} /></div>
                    {renderCrmField({ key: "place_of_birth", label: "Place of Birth" })}
                    <div>
                      <label className={labelCls}>Gender</label>
                      <select className={inputCls} value={profile.gender || ""} onChange={(e) => updateProfile("gender", (e.target.value || undefined) as UserProfile["gender"])}>
                        <option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                      </select>
                    </div>
                    {renderCrmField({ key: "country", label: "Citizenship Country ID", type: "number" })}
                    {renderCrmField({ key: "id_country", label: "ID Country ID", type: "number" })}
                    {renderCrmField({ key: "residency", label: "Residency", type: "select", options: [{ value: "resident", label: "Resident" }, { value: "non_resident", label: "Non resident" }] })}
                    <div>
                      <label className={labelCls}>Marital Status</label>
                      <select className={inputCls} value={profile.maritalStatus || "unknown"} onChange={(e) => updateProfile("maritalStatus", e.target.value as UserProfile["maritalStatus"])}>
                        {maritalStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Date of Marriage</label><input className={inputCls} type="date" value={profile.dateOfMarriage || ""} onChange={(e) => updateProfile("dateOfMarriage", e.target.value)} /></div>
                    {renderCrmField({ key: "id_issue_date", label: "ID Issue Date", type: "date" })}
                    {renderCrmField({ key: "id_expire_date", label: "ID Expiry Date", type: "date" })}
                    {renderCrmField({ key: "maiden_name", label: "Maiden Name" })}
                    {renderCrmField({ key: "retirement_age", label: "Retirement Age", type: "number" })}
                    {renderCrmField({ key: "smoking_status", label: "Smoking Status", type: "select", options: [{ value: "smoker", label: "Smoker" }, { value: "non_smoker", label: "Non smoker" }] })}
                    {renderCrmField({ key: "influence_control", label: "Influence Control", type: "select", options: [{ value: "owner", label: "Owner" }, { value: "influencial", label: "Influential" }, { value: "non_influencial", label: "Non influential" }] })}
                  </div>
                </section>
              )}

              {activeTab === "work" && (
                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Work & Wealth Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelCls}>Employer</label><input className={inputCls} value={profile.employer || ""} onChange={(e) => updateProfile("employer", e.target.value)} /></div>
                    <div><label className={labelCls}>Occupation</label><input className={inputCls} value={profile.occupation || ""} onChange={(e) => updateProfile("occupation", e.target.value)} /></div>
                    <div><label className={labelCls}>Highest Qualification</label><input className={inputCls} value={profile.highestQualification || ""} onChange={(e) => updateProfile("highestQualification", e.target.value)} /></div>
                    <div><label className={labelCls}>Monthly Income</label><input className={inputCls} type="number" min="0" step="0.01" value={profile.monthlyIncome ?? 0} onChange={(e) => updateProfile("monthlyIncome", toNumberOrUndefined(e.target.value) ?? 0)} /></div>
                    <div><label className={labelCls}>Estimated AUM / Capital</label><input className={inputCls} type="number" min="0" step="0.01" value={profile.capital ?? ""} onChange={(e) => updateNumber("capital", e.target.value)} /></div>
                    <div><label className={labelCls}>Monthly Savings Goal</label><input className={inputCls} type="number" min="0" step="0.01" value={profile.savingsGoal ?? ""} onChange={(e) => updateNumber("savingsGoal", e.target.value)} /></div>
                    <div><label className={labelCls}>Source of Wealth</label><select className={inputCls} value={profile.sourceOfWealth || ""} onChange={(e) => updateProfile("sourceOfWealth", (e.target.value || undefined) as UserProfile["sourceOfWealth"])}><option value="">Select source</option>{sourceOfWealthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    <div><label className={labelCls}>Industry Classification</label><select className={inputCls} value={profile.industryClassification || ""} onChange={(e) => updateProfile("industryClassification", (e.target.value || undefined) as UserProfile["industryClassification"])}><option value="">Select industry</option>{industryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    {renderCrmField({ key: "industry", label: "Industry ID", type: "number" })}
                    {renderCrmField({ key: "source_of_income", label: "Source of Income ID", type: "number" })}
                    {renderCrmField({ key: "annual_income", label: "Annual Income / Turnover", type: "number" })}
                    {renderCrmField({ key: "estimated_aum", label: "Estimated AUM", type: "number" })}
                    {renderCrmField({ key: "accrual_start_value", label: "Accrual Start Value", type: "number" })}
                  </div>
                </section>
              )}

              {activeTab === "compliance" && <section className="space-y-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white">Compliance</h2>{renderCrmFields("compliance")}</section>}

              {activeTab === "banking" && (
                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Banking Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelCls}>Account Holder</label><input name="clientbanking_set-0-account_holder" className={inputCls} value={profile.bankAccountHolder || ""} onChange={(e) => updateProfile("bankAccountHolder", e.target.value)} /></div>
                    <div>
                      <label className={labelCls}>Bank</label>
                      <select name="clientbanking_set-0-bank" className={inputCls} value={profile.bankCode ?? ""} onChange={(e) => updateNumber("bankCode", e.target.value)}>
                        <option value="">---------</option>
                        {bankOptions.map((bank) => <option key={bank.value} value={bank.value}>{bank.label}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Bank Name</label><input name="clientbanking_set-0-bank_name" className={inputCls} value={profile.bankName || ""} onChange={(e) => updateProfile("bankName", e.target.value)} /></div>
                    <div><label className={labelCls}>Branch Code</label><input name="clientbanking_set-0-branch_code" className={inputCls} value={profile.bankBranchCode || ""} onChange={(e) => updateProfile("bankBranchCode", e.target.value)} /></div>
                    <div><label className={labelCls}>Account Type</label><input name="clientbanking_set-0-account_type" className={inputCls} value={profile.bankAccountType || ""} onChange={(e) => updateProfile("bankAccountType", e.target.value)} /></div>
                    <div><label className={labelCls}>Account Number</label><input name="clientbanking_set-0-account_number" className={inputCls} value={profile.bankAccountNumber || ""} onChange={(e) => updateProfile("bankAccountNumber", e.target.value)} /></div>
                  </div>
                </section>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <button type="button" onClick={() => setActiveTab(TABS[Math.max(activeTabIndex - 1, 0)].id)} disabled={isFirstTab || isSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {!isLastTab ? (
                <button type="button" onClick={() => setActiveTab(TABS[Math.min(activeTabIndex + 1, TABS.length - 1)].id)} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50">
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save and Sync CRM</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
