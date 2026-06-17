"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Info, Award, BarChart3, PieChart } from "lucide-react";
import { storage } from "@/lib/storage";
import type { Income } from "@/types";
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

export default function IncomeView() {
    type IncomeRow = {
        id?: string;
        category?: Income["category"];
        type?: Income["type"];
        incomeType: string;
        source: string;
        name: string;
        personal: number;
        total: number;
        points: number;
    };

    const [incomeData, setIncomeData] = useState<IncomeRow[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<IncomeRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const fromTable = await storage.getIncome();
            if (fromTable.length > 0) {
                setIncomeData(fromTable.map((i) => ({
                    id: i.id,
                    category: i.category,
                    type: i.type,
                    incomeType: i.category,
                    source: i.type,
                    name: i.name,
                    personal: i.personal,
                    total: i.personal,
                    points: i.points,
                })));
            } else {
                const d = await storage.getOnboardingData();
                setIncomeData((d.income || []).map((i: any) => ({
                    id: i.id,
                    category: i.incomeType as Income["category"],
                    type: (i.source === "Variable" ? "Variable" : "Fixed") as Income["type"],
                    incomeType: i.incomeType,
                    source: i.source,
                    name: i.name,
                    personal: i.personal,
                    total: i.total ?? i.personal,
                    points: i.points,
                })));
            }
        })();
    }, []);

    const totalPersonal = incomeData.reduce((sum, item) => sum + (item.personal || 0), 0);
    const totalIncome = incomeData.reduce((sum, item) => sum + (item.total || item.personal || 0), 0);
    const totalPoints = incomeData.reduce((sum, item) => sum + (item.points || 0), 0);
    const fixedIncomeTotal = incomeData.reduce(
        (sum, item) => (item.source === "Fixed" ? sum + (item.total || item.personal || 0) : sum),
        0
    );
    const variableIncomeTotal = incomeData.reduce(
        (sum, item) => (item.source === "Variable" ? sum + (item.total || item.personal || 0) : sum),
        0
    );

    const openEditModal = () => {
        setSaveError(null);
        setEditingIncome(incomeData.map((item) => ({ ...item })));
        setIsEditModalOpen(true);
    };

    const updateEditingAmount = (idx: number, value: string) => {
        const numericValue = Math.max(0, Number(value) || 0);
        setEditingIncome((prev) =>
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

            const itemsToSave: Income[] = editingIncome.map((item, idx) => ({
                id: item.id || crypto.randomUUID(),
                category: (item.category || item.incomeType) as Income["category"],
                type: (item.type || (item.source === "Variable" ? "Variable" : "Fixed")) as Income["type"],
                name: item.name || `${item.incomeType} ${idx + 1}`,
                personal: item.personal || 0,
                spouse: 0,
                points: item.points || 0,
                editable: true,
            }));

            await storage.saveIncome(itemsToSave);
            setIncomeData(editingIncome.map((item) => ({ ...item, total: item.personal || 0 })));
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to save income amounts:", error);
            setSaveError("Could not save right now. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={openEditModal}
                    disabled={incomeData.length === 0}
                    className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Edit Amount
                </button>
            </div>

            {/* Header Section */}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    Income Sources
                </h2>
            </div>

            {/* Summary Cards */}
            {incomeData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Income by Type</p>
                                <p className="text-xl font-bold text-blue-700 dark:text-blue-100 mt-1">
                                    R{totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-300 font-medium">Combined Income</p>
                                <p className="text-xl font-bold text-green-700 dark:text-green-100 mt-1">
                                    R{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Income Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomeData.length > 0 ? (
                                incomeData.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-50 dark:hover:from-gray-700/50 dark:hover:to-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200">
                                                {item.incomeType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200">
                                                {item.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">{item.name || "-"}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-gray-900 dark:text-white font-semibold">R{(item.personal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                                            <p className="text-gray-500 dark:text-gray-400">No income data recorded during onboarding</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {incomeData.length > 0 && (
                            <tfoot>
                                <tr className="bg-gradient-to-r from-green-50 to-green-50 dark:from-green-900/20 dark:to-green-900/20 border-t-2 border-green-200 dark:border-green-700">
                                    <th scope="row" colSpan={3} className="px-6 py-4 font-bold text-gray-900 dark:text-white text-base">
                                        Total Monthly Income
                                    </th>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                                            R{totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <span>This data is currently read from your onboarding setup. Points indicate the importance/priority level of each income source. In the future, you will be able to manage and track individual income payments here.</span>
                </p>
            </div>

            {/* Charts Section */}
            {incomeData.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-green-600" />
                        Income Analysis
                    </h3>

                   

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income by Type */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-green-600" />
                                Income by Type
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {incomeData.length > 0 ? (
                                    <Pie
                                        data={{
                                            labels: incomeData.map(i => i.incomeType),
                                            datasets: [{
                                                data: incomeData.map(i => (i.total || i.personal || 0)),
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
                                ) : (
                                    <p className="text-gray-500">No data available</p>
                                )}
                            </div>
                        </div>

                        {/* Income by Type (Bar) */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                Income by Type (Bar)
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {incomeData.length > 0 ? (
                                    <Bar
                                        data={{
                                            labels: incomeData.map(i => i.incomeType),
                                            datasets: [{
                                                label: 'Total Income',
                                                data: incomeData.map(i => (i.total || i.personal || 0)),
                                                backgroundColor: '#3b82f6',
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
                                ) : (
                                    <p className="text-gray-500">No data available</p>
                                )}
                            </div>
                        </div>

                       
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income by Source (Pie) */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-indigo-600" />
                                Income by Source
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                <Pie
                                    data={{
                                        labels: ["Fixed", "Variable"],
                                        datasets: [{
                                            data: [fixedIncomeTotal, variableIncomeTotal],
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

                        {/* Income by Source (Bar) */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                Income by Source (Bar)
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                <Bar
                                    data={{
                                        labels: ["Fixed", "Variable"],
                                        datasets: [{
                                            label: 'Total Income',
                                            data: [fixedIncomeTotal, variableIncomeTotal],
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
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Income Amounts</h3>
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
                            {editingIncome.map((item, idx) => (
                                <div key={`${item.incomeType}-${idx}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                                    <div className="sm:col-span-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.incomeType}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.name || item.source}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount (R)</label>
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
