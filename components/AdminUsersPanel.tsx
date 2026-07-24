"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Users,
  Pencil,
  Trash2,
  X,
  Save,
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "admin" | "user" | "counselor";
  monthlyIncome: number;
  onboardingCompleted: boolean;
  userPoints: number;
  createdAt: string;
}

interface UserFormState {
  name: string;
  email: string;
  phone: string;
  monthlyIncome: string;
  userPoints: string;
  onboardingCompleted: boolean;
  role: "admin" | "user" | "counselor";
  password: string;
}

interface ApiErrorResponse {
  error?: string;
}

interface UsersResponse {
  users?: AdminUser[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

const EMPTY_CREATE_FORM: UserFormState = {
  name: "",
  email: "",
  phone: "",
  monthlyIncome: "0",
  userPoints: "0",
  onboardingCompleted: false,
  role: "user",
  password: "",
};

const EMPTY_EDIT_FORM: UserFormState = {
  name: "",
  email: "",
  phone: "",
  monthlyIncome: "0",
  userPoints: "0",
  onboardingCompleted: false,
  role: "user",
  password: "",
};

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You must be signed in to use the admin panel.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const [createForm, setCreateForm] = useState<UserFormState>(EMPTY_CREATE_FORM);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_EDIT_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user" | "counselor">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const editingUser = useMemo(
    () => users.find((u) => u.id === editingUserId) ?? null,
    [editingUserId, users]
  );

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const headers = await getAuthHeader();
      const query = new URLSearchParams({
        search: searchTerm,
        role: roleFilter,
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/admin/users?${query.toString()}`, {
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
  }, [page, pageSize, roleFilter, searchTerm]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          phone: createForm.phone.trim() || null,
          monthlyIncome: Number(createForm.monthlyIncome || 0),
          userPoints: Number(createForm.userPoints || 0),
          onboardingCompleted: createForm.onboardingCompleted,
          role: createForm.role,
          password: createForm.password,
        }),
      });

      const json = (await response.json()) as { user?: AdminUser; error?: string };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to add user.");
      setCreateForm(EMPTY_CREATE_FORM);
      setSuccess("User added successfully.");
      setPage(1);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginEdit = (user: AdminUser) => {
    clearMessages();
    setEditingUserId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      monthlyIncome: String(user.monthlyIncome ?? 0),
      userPoints: String(user.userPoints ?? 0),
      onboardingCompleted: user.onboardingCompleted,
      role: user.role,
      password: "",
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditForm(EMPTY_EDIT_FORM);
  };

  const saveEdit = async () => {
    if (!editingUserId) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim() || null,
          monthlyIncome: Number(editForm.monthlyIncome || 0),
          userPoints: Number(editForm.userPoints || 0),
          onboardingCompleted: editForm.onboardingCompleted,
          role: editForm.role,
          password: editForm.password.trim() || undefined,
        }),
      });
      const json = (await response.json()) as { user?: AdminUser; error?: string };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to update user.");
      cancelEdit();
      setSuccess("User updated successfully.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = window.confirm(`Delete user "${user.email}"? This cannot be undone.`);
    if (!confirmed) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers,
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok || !json.success) throw new Error(json.error ?? "Failed to delete user.");
      setSuccess("User deleted successfully.");
      if (editingUserId === user.id) cancelEdit();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applySearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  if (isForbidden) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-600 dark:text-amber-300" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-amber-900 dark:text-amber-200">Admin Access Denied</h1>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Your account is not allowed to use this admin panel.
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Ask the project owner to either add your email to `ADMIN_PANEL_EMAILS` or set your profile
              role to `admin`.
            </p>
            <button
              type="button"
              onClick={loadUsers}
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30"
            >
              Retry access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/30">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View users, update details, create new users, and remove accounts.
            </p>
          </div>
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
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add User</h2>
        </div>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleCreateSubmit}>
          <input
            required
            type="text"
            placeholder="Full name"
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            required
            minLength={6}
            type="password"
            placeholder="Password (min 6 chars)"
            value={createForm.password}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={createForm.phone}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="number"
            min={0}
            placeholder="Monthly income"
            value={createForm.monthlyIncome}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, monthlyIncome: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="number"
            min={0}
            placeholder="User points"
            value={createForm.userPoints}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, userPoints: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={createForm.role}
            onChange={(e) =>
              setCreateForm((prev) => ({
                ...prev,
                role:
                  e.target.value === "admin"
                    ? "admin"
                    : e.target.value === "counselor"
                      ? "counselor"
                      : "user",
              }))
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="user">Role: User</option>
            <option value="counselor">Role: Counselor</option>
            <option value="admin">Role: Admin</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
            <input
              type="checkbox"
              checked={createForm.onboardingCompleted}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, onboardingCompleted: e.target.checked }))
              }
            />
            Onboarding completed
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" /> Add user
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total: {totalUsers}</p>
        </div>

        <form onSubmit={applySearch} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
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
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Role filter
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as "all" | "admin" | "user" | "counselor");
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All roles</option>
              <option value="admin">Admins only</option>
              <option value="counselor">Counselors only</option>
              <option value="user">Users only</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Page size
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </form>

        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            <div className="inline-flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              No users found.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const isEditing = editingUserId === user.id;
              return (
                <article
                  key={user.id}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  {!isEditing ? (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{user.name || "No name"}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Role: {user.role.toUpperCase()} | Phone: {user.phone || "N/A"} | Income:{" "}
                          {user.monthlyIncome} | Points: {user.userPoints} | Onboarding:{" "}
                          {user.onboardingCompleted ? "Done" : "Pending"} | Created:{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleDelete(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="Name"
                        />
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="Email"
                        />
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="Phone"
                        />
                        <select
                          value={editForm.role}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              role:
                                e.target.value === "admin"
                                  ? "admin"
                                  : e.target.value === "counselor"
                                    ? "counselor"
                                    : "user",
                            }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="user">Role: User</option>
                          <option value="counselor">Role: Counselor</option>
                          <option value="admin">Role: Admin</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={editForm.monthlyIncome}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, monthlyIncome: e.target.value }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="Monthly income"
                        />
                        <input
                          type="number"
                          min={0}
                          value={editForm.userPoints}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, userPoints: e.target.value }))}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="User points"
                        />
                        <input
                          type="password"
                          minLength={6}
                          value={editForm.password}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="New password (optional)"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={editForm.onboardingCompleted}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              onboardingCompleted: e.target.checked,
                            }))
                          }
                        />
                        Onboarding completed
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting || !editingUser}
                          onClick={saveEdit}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
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
