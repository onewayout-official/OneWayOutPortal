"use client";

import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import { CreditCard, AlertCircle, Info, TrendingDown, Award, BarChart3, PieChart } from "lucide-react";
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

export default function LiabilityView() {
    const [liabilityData, setLiabilityData] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const fromTable = await storage.getLiabilities();
            if (fromTable.length > 0) {
                setLiabilityData(fromTable.map((l) => ({
                    expenses: l.category,
                    expenseType: l.type,
                    name: l.name,
                    personal: l.personal,
                    total: l.personal,
                    points: l.points,
                    interestRate: l.interestRate,
                })));
            } else {
                const d = await storage.getOnboardingData();
                setLiabilityData((d.liabilities || []).map((l: any) => ({
                    expenses: l.expenses,
                    expenseType: l.expenseType,
                    name: l.name,
                    personal: l.personal,
                    total: l.total ?? l.personal,
                    points: l.points,
                    interestRate: l.interestRate,
                })));
            }
        })();
    }, []);

    const totalPersonal = liabilityData.reduce((sum, item) => sum + (item.personal || 0), 0);
    const totalLiabilities = liabilityData.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalPoints = liabilityData.reduce((sum, item) => sum + (item.points || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
                        <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    Liabilities
                </h2>
            </div>

            {/* Summary Cards */}
            {liabilityData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Personal Liabilities</p>
                                <p className="text-xl font-bold text-blue-700 dark:text-blue-100 mt-1">
                                    N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-blue-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/30 dark:to-orange-800/30 rounded-lg p-4 border border-red-200 dark:border-red-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600 dark:text-red-300 font-medium">Total Liabilities</p>
                                <p className="text-xl font-bold text-red-700 dark:text-red-100 mt-1">
                                    N${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
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
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Liability Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Liability Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {liabilityData.length > 0 ? (
                                liabilityData.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-50 dark:hover:from-gray-700/50 dark:hover:to-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200">
                                                {item.expenses}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">{item.name || "-"}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200">
                                                {item.expenseType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-gray-900 dark:text-white font-semibold">N${(item.personal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 font-bold">
                                                N${(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
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
                                    <td colSpan={7} className="px-6 py-8 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                            <p className="text-gray-500 dark:text-gray-400">No liability data recorded during onboarding</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {liabilityData.length > 0 && (
                            <tfoot>
                                <tr className="bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 border-t-2 border-red-200 dark:border-red-700">
                                    <th scope="row" colSpan={3} className="px-6 py-4 font-bold text-gray-900 dark:text-white text-base">
                                        Total Outstanding Liabilities
                                    </th>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                                            N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-base font-bold text-red-600 dark:text-red-400">
                                            N${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200 flex gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Liabilities listed here were captured during onboarding. Points indicate the priority level of each liability. You can manage detailed repayment schedules in the future.</span>
                </p>
            </div>

            {/* Charts Section */}
            {liabilityData.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-red-600" />
                        Liability Analysis
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Personal Liabilities */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-blue-600" />
                                Personal Liabilities
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {liabilityData.some(i => (i.personal || 0) > 0) ? (
                                    <Pie
                                        data={{
                                            labels: liabilityData.filter(i => (i.personal || 0) > 0).map(i => i.expenses),
                                            datasets: [{
                                                data: liabilityData.filter(i => (i.personal || 0) > 0).map(i => i.personal || 0),
                                                backgroundColor: ['#3b82f6', '#06b6d4', '#0ea5e9', '#60a5fa', '#93c5fd'],
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
                                    <p className="text-gray-500">No personal liability data</p>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: <span className="text-blue-600 dark:text-blue-400">N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                            </div>
                        </div>

                        {/* Liability Distribution */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-red-600" />
                                Distribution
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {liabilityData.length > 0 ? (
                                    <Pie
                                        data={{
                                            labels: ['Total'],
                                            datasets: [{
                                                data: [totalLiabilities],
                                                backgroundColor: ['#3b82f6'],
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
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: <span className="text-red-600 dark:text-red-400">N${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Liabilities by Type */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-orange-600" />
                                Liabilities by Type
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {liabilityData.length > 0 ? (
                                    <Pie
                                        data={{
                                            labels: liabilityData.map(i => i.expenses),
                                            datasets: [{
                                                data: liabilityData.map(i => (i.personal || 0)),
                                                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'],
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

                        {/* Personal vs Total */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-purple-600" />
                                Personal vs Total
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {liabilityData.length > 0 ? (
                                    <Bar
                                        data={{
                                            labels: liabilityData.map(i => i.expenses),
                                            datasets: [
                                                {
                                                    label: 'Total',
                                                    data: liabilityData.map(i => i.total || i.personal || 0),
                                                    backgroundColor: '#3b82f6',
                                                }
                                            ]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { position: 'bottom' }
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
                </div>
            )}
        </div>
    );
}
