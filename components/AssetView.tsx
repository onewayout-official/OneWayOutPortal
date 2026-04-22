"use client";

import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import type { Asset } from "@/types";
import { TrendingUp, Info, DollarSign, Award, BarChart3, PieChart } from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

export default function AssetView() {
    type AssetRow = {
        id?: string;
        category?: Asset["category"];
        type?: Asset["type"];
        expenses: string;
        expenseType: string;
        name: string;
        personal: number;
        total: number;
        points: number;
        interestRate: number;
    };

    const [assetData, setAssetData] = useState<AssetRow[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAssets, setEditingAssets] = useState<AssetRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const fromTable = await storage.getAssets();
            if (fromTable.length > 0) {
                setAssetData(fromTable.map((a) => ({
                    id: a.id,
                    category: a.category,
                    type: a.type,
                    expenses: a.category,
                    expenseType: a.type,
                    name: a.name,
                    personal: a.personal,
                    total: a.personal,
                    points: a.points,
                    interestRate: a.interestRate,
                })));
            } else {
                const d = await storage.getOnboardingData();
                setAssetData((d.assets || []).map((a: any) => ({
                    id: a.id,
                    category: a.expenses as Asset["category"],
                    type: (a.expenseType === "Current Assets" ? "Current Assets" : "Fixed Assets") as Asset["type"],
                    expenses: a.expenses,
                    expenseType: a.expenseType,
                    name: a.name,
                    personal: a.personal,
                    total: a.total ?? a.personal,
                    points: a.points,
                    interestRate: a.interestRate,
                })));
            }
        })();
    }, []);

    const totalPersonal = assetData.reduce((sum, item) => sum + (item.personal || 0), 0);
    const totalValue = assetData.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalPoints = assetData.reduce((sum, item) => sum + (item.points || 0), 0);
    const assetsByCategory = assetData.reduce((acc, item) => {
        const category = item.expenses || "Other";
        acc[category] = (acc[category] || 0) + (item.personal || 0);
        return acc;
    }, {} as Record<string, number>);
    const fixedAssetsTotal = assetData.reduce(
        (sum, item) =>
            String(item.expenseType || "").toLowerCase() === "fixed assets"
                ? sum + (item.personal || 0)
                : sum,
        0
    );
    const currentAssetsTotal = assetData.reduce(
        (sum, item) =>
            String(item.expenseType || "").toLowerCase() === "current assets"
                ? sum + (item.personal || 0)
                : sum,
        0
    );

    const openEditModal = () => {
        setSaveError(null);
        setEditingAssets(assetData.map((item) => ({ ...item })));
        setIsEditModalOpen(true);
    };

    const updateEditingAmount = (idx: number, value: string) => {
        const numericValue = Math.max(0, Number(value) || 0);
        setEditingAssets((prev) =>
            prev.map((item, itemIdx) =>
                itemIdx === idx
                    ? { ...item, personal: numericValue, total: numericValue }
                    : item
            )
        );
    };

    const saveEditedAmounts = async () => {
        try {
            setIsSaving(true);
            setSaveError(null);

            const itemsToSave: Asset[] = editingAssets.map((item, idx) => ({
                id: item.id || crypto.randomUUID(),
                category: (item.category || item.expenses) as Asset["category"],
                type: (item.type || (item.expenseType === "Current Assets" ? "Current Assets" : "Fixed Assets")) as Asset["type"],
                name: item.name || `${item.expenses} ${idx + 1}`,
                personal: item.personal || 0,
                spouse: 0,
                points: item.points || 0,
                interestRate: item.interestRate || 0,
                editable: true,
            }));

            await storage.saveAssets(itemsToSave);
            setAssetData(editingAssets.map((item) => ({ ...item, total: item.personal || 0 })));
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to save asset amounts:", error);
            setSaveError("Could not save right now. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    Assets Overview
                </h2>
                <button
                    type="button"
                    onClick={openEditModal}
                    disabled={assetData.length === 0}
                    className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Edit Amount
                </button>
            </div>

            {/* Summary Cards */}
            {assetData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Personal Total</p>
                                <p className="text-xl font-bold text-blue-700 dark:text-blue-100 mt-1">
                                    N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-300 font-medium">Combined Total</p>
                                <p className="text-xl font-bold text-green-700 dark:text-green-100 mt-1">
                                    N${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Total Points</p>
                                <p className="text-xl font-bold text-purple-700 dark:text-purple-100 mt-1">
                                    {totalPoints}
                                </p>
                            </div>
                            <Award className="h-8 w-8 text-purple-500 opacity-50" />
                        </div>
                    </div>
                </div>
            )}

            {/* Table Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Asset Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Asset Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Amount</th>
                                
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assetData.length > 0 ? (
                                assetData.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-50 dark:hover:from-gray-700/50 dark:hover:to-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200">
                                                {item.expenses}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">{item.name || "-"}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-600 dark:text-gray-300">{item.expenseType}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-gray-900 dark:text-white font-semibold">N${(item.personal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </td>
                                       
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 font-bold">
                                                {item.points || 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <TrendingUp className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                            <p className="text-gray-500 dark:text-gray-400">No asset data recorded during onboarding</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {assetData.length > 0 && (
                            <tfoot>
                                <tr className="bg-gradient-to-r from-emerald-50 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/20 border-t-2 border-emerald-200 dark:border-emerald-700">
                                    <th scope="row" colSpan={3} className="px-6 py-4 font-bold text-gray-900 dark:text-white text-base">
                                        Total Assets
                                    </th>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                                            N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                                            {totalPoints}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Info Section */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex gap-3">
                    <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>This view shows the assets you listed during onboarding. Points indicate the importance/priority level of each asset. You will be able to track performance and appreciation over time in a future update.</span>
                </p>
            </div>

            {/* Charts Section */}
            {assetData.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-green-600" />
                        Asset Analysis
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Assets by Category */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-emerald-600" />
                                Assets by Type
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                <Pie
                                    data={{
                                        labels: Object.keys(assetsByCategory),
                                        datasets: [{
                                            data: Object.values(assetsByCategory),
                                            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                                            borderWidth: 0,
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom' }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Assets by Category (Bar) */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                Assets by Type (Bar)
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                <Bar
                                    data={{
                                        labels: Object.keys(assetsByCategory),
                                        datasets: [{
                                            label: "Total Assets",
                                            data: Object.values(assetsByCategory),
                                            backgroundColor: '#10b981',
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: { beginAtZero: true }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Assets by Type */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-indigo-600" />
                                Assets by Type
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                <Pie
                                    data={{
                                        labels: ["Fixed Assets", "Current Assets"],
                                        datasets: [{
                                            data: [fixedAssetsTotal, currentAssetsTotal],
                                            backgroundColor: ['#6366f1', '#06b6d4'],
                                            borderWidth: 0,
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom' }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Assets by Type (Bar) */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                Assets by Type (Bar)
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                <Bar
                                    data={{
                                        labels: ["Fixed Assets", "Current Assets"],
                                        datasets: [{
                                            label: "Total Assets",
                                            data: [fixedAssetsTotal, currentAssetsTotal],
                                            backgroundColor: '#6366f1',
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: { beginAtZero: true }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => !isSaving && setIsEditModalOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Asset Amounts</h3>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSaving}
                                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto max-h-[55vh]">
                            {editingAssets.map((item, idx) => (
                                <div key={`${item.expenses}-${idx}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                                    <div className="sm:col-span-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.expenses}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.name || item.expenseType}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount (N$)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={item.personal || 0}
                                            onChange={(e) => updateEditingAmount(idx, e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            ))}

                            {saveError && (
                                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveEditedAmounts}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
