"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Info, Award, BarChart3, PieChart } from "lucide-react";
import { storage } from "@/lib/storage";
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
    const [incomeData, setIncomeData] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const fromTable = await storage.getIncome();
            if (fromTable.length > 0) {
                setIncomeData(fromTable.map((i) => ({
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

    return (
        <div className="space-y-6">
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
                                <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Personal Income</p>
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
                                <p className="text-sm text-green-600 dark:text-green-300 font-medium">Combined Income</p>
                                <p className="text-xl font-bold text-green-700 dark:text-green-100 mt-1">
                                    N${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Total</th>
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
                                            <span className="text-gray-900 dark:text-white font-semibold">N${(item.personal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200 font-bold">
                                                N${(item.total || item.personal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                            N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-base font-bold text-green-600 dark:text-green-400">
                                            N${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Personal Income */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-blue-600" />
                                Personal Income
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {incomeData.some(i => (i.personal || 0) > 0) ? (
                                    <Pie
                                        data={{
                                            labels: incomeData.filter(i => (i.personal || 0) > 0).map(i => i.incomeType),
                                            datasets: [{
                                                data: incomeData.filter(i => (i.personal || 0) > 0).map(i => i.personal || 0),
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
                                    <p className="text-gray-500">No personal income data</p>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: <span className="text-blue-600 dark:text-blue-400">N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                            </div>
                        </div>

                        {/* Income Distribution */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-orange-600" />
                                Distribution
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {incomeData.length > 0 ? (
                                    <Pie
                                        data={{
                                            labels: ['Total'],
                                            datasets: [{
                                                data: [totalIncome],
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
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: <span className="text-green-600 dark:text-green-400">N${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                            </div>
                        </div>
                    </div>

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

                        {/* Income by Source */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                Income by Source
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {incomeData.length > 0 ? (
                                    <Bar
                                        data={{
                                            labels: incomeData.map(i => i.source),
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

                        {/* Personal vs Total */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-purple-600" />
                                Personal vs Total
                            </h4>
                            <div className="h-[300px] w-full flex items-center justify-center">
                                {incomeData.length > 0 ? (
                                    <Bar
                                        data={{
                                            labels: incomeData.map(i => i.incomeType),
                                            datasets: [
                                                {
                                                    label: 'Total',
                                                    data: incomeData.map(i => i.total || i.personal || 0),
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
