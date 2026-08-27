"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  UserX,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { getAuthHeader } from "@/lib/authHeader";
import type { PlatformUserSummary, SortOrder, UserSortField } from "@/lib/usersAdminApi";
import type { ProfileStatus } from "@/lib/profileStatus";
import { downloadUsersCsv, downloadUsersPdf } from "@/lib/usersExport";

interface UsersResponse {
  users?: PlatformUserSummary[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  if (status === "suspended") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        Suspended
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
      Active
    </span>
  );
}

function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  align = "left",
}: {
  label: string;
  field: UserSortField;
  sortBy: UserSortField;
  sortOrder: SortOrder;
  onSort: (field: UserSortField) => void;
  align?: "left" | "right";
}) {
  const isActive = sortBy === field;

  return (
    <th className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-gray-900 dark:hover:text-white ${
          isActive ? "text-indigo-600 dark:text-indigo-400" : ""
        }`}
      >
        {label}
        {isActive &&
          (sortOrder === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          ))}
      </button>
    </th>
  );
}

export default function UsersPanel() {
  const [users, setUsers] = useState<PlatformUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState<UserSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeader();
      const query = new URLSearchParams({
        search: searchTerm,
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
      });
      const response = await fetch(`/api/users-admin/users?${query.toString()}`, {
        method: "GET",
        headers,
      });
      const json = (await response.json()) as UsersResponse;
      if (response.status === 403) {
        setIsForbidden(true);
        setUsers([]);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to load users.");
      setIsForbidden(false);
      setUsers(json.users ?? []);
      setTotalUsers(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSort = (field: UserSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const applySearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleStatusChange = async (user: PlatformUserSummary, status: ProfileStatus) => {
    const isSuspending = status === "suspended";
    const confirmed = window.confirm(
      isSuspending
        ? `Suspend ${user.email}? They will not be able to sign in, but their data will be kept.`
        : `Reactivate ${user.email}? They will be able to sign in again.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/users-admin/users/${user.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      const json = (await response.json()) as { error?: string };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to update user status.");
      setSuccess(
        isSuspending
          ? `${user.email} has been suspended.`
          : `${user.email} has been reactivated.`
      );
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAllUsersForExport = async (): Promise<PlatformUserSummary[]> => {
    const headers = await getAuthHeader();
    const query = new URLSearchParams({
      sortBy,
      sortOrder,
    });
    const response = await fetch(`/api/users-admin/users/export?${query.toString()}`, {
      method: "GET",
      headers,
    });
    const json = (await response.json()) as { users?: PlatformUserSummary[]; error?: string };
    if (response.status === 403) {
      setIsForbidden(true);
      throw new Error("You do not have permission to export users.");
    }
    if (!response.ok) throw new Error(json.error ?? "Failed to fetch users for export.");
    return json.users ?? [];
  };

  const handleExport = async (format: "csv" | "pdf") => {
    setError(null);
    setSuccess(null);
    setIsExporting(format);
    try {
      const allUsers = await fetchAllUsersForExport();
      if (allUsers.length === 0) {
        setError("No users available to export.");
        return;
      }
      if (format === "csv") {
        downloadUsersCsv(allUsers);
      } else {
        await downloadUsersPdf(allUsers);
      }
      setSuccess(
        `Exported ${allUsers.length} user${allUsers.length === 1 ? "" : "s"} as ${format.toUpperCase()}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export users.");
    } finally {
      setIsExporting(null);
    }
  };

  if (isForbidden) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-600 dark:text-amber-300" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-amber-900 dark:text-amber-200">Access Denied</h1>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You do not have permission to view the Users page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/30">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Browse member accounts, review wallet balances and reward points, and access detailed profiles.
              </p>
            </div>
          </div>
          <Link
            href="/users/create"
            className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4" />
            Create User
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
          {success}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Users</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total: {totalUsers}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={Boolean(isExporting)}
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isExporting === "csv" ? "Exporting..." : "Export CSV"}
            </button>
            <button
              type="button"
              disabled={Boolean(isExporting)}
              onClick={() => handleExport("pdf")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <FileText className="h-4 w-4" />
              {isExporting === "pdf" ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>

        <form onSubmit={applySearch} className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Search by name or email
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type user name or email"
              className="w-full bg-transparent text-sm text-gray-900 outline-none dark:text-white"
            />
          </div>
        </form>

        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <SortableHeader
                    label="Name"
                    field="name"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Email"
                    field="email"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Mobile"
                    field="phone"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-left">Status</th>
                  <SortableHeader
                    label="Wallet Balance"
                    field="walletBalance"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Total Points"
                    field="totalPoints"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Amount Spent"
                    field="amountSpent"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Joined"
                    field="createdAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700/60 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">
                      {user.name || "—"}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{user.email}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                      {user.phone || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-white">
                      R {formatCurrency(user.walletBalance)}
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-white">
                      {user.totalPoints.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-white">
                      R {formatCurrency(user.amountSpent)}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/users/${user.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <Eye className="h-4 w-4" /> View
                        </Link>
                        {user.status === "active" ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleStatusChange(user, "suspended")}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/20"
                          >
                            <UserX className="h-4 w-4" /> Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleStatusChange(user, "active")}
                            className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-60 dark:border-green-900/30 dark:text-green-300 dark:hover:bg-green-900/20"
                          >
                            <UserCheck className="h-4 w-4" /> Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
