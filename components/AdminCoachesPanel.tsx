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
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Counselor, resolveCounselorImage, splitCounselorName } from "@/lib/counselors";
import { getAuthHeader } from "@/lib/authHeader";

interface CoachFormState {
  firstName: string;
  lastName: string;
  specialty: string;
  bio: string;
  about: string;
  experienceYears: string;
  languages: string;
  location: string;
  availability: string;
  image: string;
  isActive: boolean;
  linkedUserEmail: string;
  password: string;
}

const EMPTY_FORM: CoachFormState = {
  firstName: "",
  lastName: "",
  specialty: "",
  bio: "",
  about: "",
  experienceYears: "",
  languages: "English",
  location: "",
  availability: "",
  image: "",
  isActive: true,
  linkedUserEmail: "",
  password: "",
};

function coachToForm(coach: Counselor): CoachFormState {
  const { firstName, lastName } = splitCounselorName(coach.name);
  return {
    firstName,
    lastName,
    specialty: coach.specialty,
    bio: coach.bio,
    about: coach.about,
    experienceYears: String(coach.experienceYears),
    languages: coach.languages.join(", "),
    location: coach.location,
    availability: coach.availability.join(", "),
    image: coach.image,
    isActive: Boolean(coach.isActive),
    linkedUserEmail: coach.linkedUserEmail ?? "",
    password: "",
  };
}

function FormField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}

function formToPayload(form: CoachFormState, includePassword = false) {
  const payload: Record<string, string | number | boolean | null> = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    specialty: form.specialty.trim(),
    bio: form.bio.trim(),
    about: form.about.trim(),
    experienceYears: Number(form.experienceYears || 0),
    languages: form.languages,
    location: form.location.trim(),
    availability: form.availability,
    image: form.image.trim(),
    isActive: form.isActive,
    linkedUserEmail: form.linkedUserEmail.trim() || null,
  };

  if (includePassword) {
    payload.password = form.password;
  }

  return payload;
}

export default function AdminCoachesPanel() {
  const [coaches, setCoaches] = useState<Counselor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const [createForm, setCreateForm] = useState<CoachFormState>(EMPTY_FORM);
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CoachFormState>(EMPTY_FORM);

  const editingCoach = useMemo(
    () => coaches.find((coach) => coach.id === editingCoachId) ?? null,
    [coaches, editingCoachId]
  );

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const loadCoaches = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/admin/coaches", { method: "GET", headers });
      const json = (await response.json()) as { coaches?: Counselor[]; error?: string };
      if (response.status === 403) {
        setIsForbidden(true);
        setCoaches([]);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to load coaches.");
      setIsForbidden(false);
      setCoaches(json.coaches ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coaches.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/admin/coaches", {
        method: "POST",
        headers,
        body: JSON.stringify(formToPayload(createForm, true)),
      });
      const json = (await response.json()) as {
        coach?: Counselor;
        error?: string;
        accountCreated?: boolean;
        passwordUpdated?: boolean;
        setupEmailSent?: boolean;
      };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to add coach.");
      setSuccess(
        json.accountCreated
          ? json.setupEmailSent
            ? "Coach added and a new counselor login was created. A secure password setup email was sent to the coach."
            : "Coach added and a new counselor login was created. The password was set, but Supabase did not send the setup email."
          : json.passwordUpdated
            ? json.setupEmailSent
              ? "Coach added successfully. The linked coach password was reset and a secure setup email was sent."
              : "Coach added successfully. The linked coach password was reset, but Supabase did not send the setup email."
          : "Coach added successfully."
      );
      setCreateForm(EMPTY_FORM);
      await loadCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add coach.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (coach: Counselor) => {
    clearMessages();
    setEditingCoachId(coach.id);
    setEditForm(coachToForm(coach));
  };

  const cancelEdit = () => {
    setEditingCoachId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleImageUpload = async (
    file: File | null,
    setForm: React.Dispatch<React.SetStateAction<CoachFormState>>
  ) => {
    if (!file) return;
    clearMessages();

    if (file.type !== "image/jpeg") {
      setError("Please choose a JPEG image (.jpg or .jpeg).");
      return;
    }

    setIsUploadingImage(true);
    try {
      const headers = await getAuthHeader();
      delete headers["Content-Type"];

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/admin/coaches/images", {
        method: "POST",
        headers,
        body: formData,
      });
      const json = (await response.json()) as { url?: string; error?: string };

      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok || !json.url) {
        throw new Error(json.error ?? "Failed to upload coach image.");
      }

      setForm((prev) => ({ ...prev, image: json.url ?? prev.image }));
      setSuccess("Profile image attached. Save the coach to keep it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload coach image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCoachId) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/coaches/${editingCoachId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(formToPayload(editForm, true)),
      });
      const json = (await response.json()) as {
        coach?: Counselor;
        error?: string;
        accountCreated?: boolean;
        passwordUpdated?: boolean;
        setupEmailSent?: boolean;
      };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to update coach.");
      setSuccess(
        json.accountCreated
          ? json.setupEmailSent
            ? "Coach updated and a new counselor login was created. A secure password setup email was sent to the coach."
            : "Coach updated and a new counselor login was created. The password was set, but Supabase did not send the setup email."
          : json.passwordUpdated
            ? json.setupEmailSent
              ? "Coach updated successfully. The coach password was reset and a secure setup email was sent."
              : "Coach updated successfully. The coach password was reset, but Supabase did not send the setup email."
          : "Coach updated successfully."
      );
      cancelEdit();
      await loadCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coach.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (coach: Counselor) => {
    clearMessages();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/coaches/${coach.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isActive: !coach.isActive }),
      });
      const json = (await response.json()) as { error?: string };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to update coach status.");
      setSuccess(`Coach ${coach.isActive ? "deactivated" : "activated"} successfully.`);
      await loadCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coach status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (coach: Counselor) => {
    if (!window.confirm(`Delete coach "${coach.name}"? This cannot be undone.`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/coaches/${coach.id}`, {
        method: "DELETE",
        headers,
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok || !json.success) throw new Error(json.error ?? "Failed to delete coach.");
      setSuccess("Coach deleted successfully.");
      if (editingCoachId === coach.id) cancelEdit();
      await loadCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete coach.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormFields = (
    form: CoachFormState,
    setForm: React.Dispatch<React.SetStateAction<CoachFormState>>,
    options: {
      includePassword?: boolean;
      passwordLabel?: string;
      passwordHint?: string;
      passwordPlaceholder?: string;
    } = {}
  ) => (
    <>
      <input
        required
        type="text"
        placeholder="First name"
        value={form.firstName}
        onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      <input
        type="text"
        placeholder="Last name"
        value={form.lastName}
        onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      <input
        type="text"
        placeholder="Specialty"
        value={form.specialty}
        onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      <input
        type="text"
        placeholder="Location"
        value={form.location}
        onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      <FormField
        label="Profile image"
        hint="Paste an image URL or attach a JPEG file from your computer."
        className="sm:col-span-2"
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="url"
            placeholder="Image URL (optional - default avatar used if empty)"
            value={form.image}
            onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-teal-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-900/20">
            {isUploadingImage ? "Uploading..." : "Attach JPEG"}
            <input
              type="file"
              accept="image/jpeg,.jpg,.jpeg"
              disabled={isUploadingImage}
              onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null, setForm)}
              className="sr-only"
            />
          </label>
        </div>
      </FormField>
      <FormField
        label="Coach login email"
        hint="Optional. Creates a counselor portal account if it does not exist yet."
        className="sm:col-span-2"
      >
        <input
          type="text"
          inputMode="email"
          autoComplete="off"
          placeholder="coach@example.com"
          value={form.linkedUserEmail}
          onChange={(e) => setForm((prev) => ({ ...prev, linkedUserEmail: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </FormField>
      {options.includePassword && (
        <FormField
          label={options.passwordLabel ?? "Initial password"}
          hint={
            options.passwordHint ??
            "Optional. Used only when creating a new coach login. The coach will also receive a secure password setup email."
          }
          className="sm:col-span-2"
        >
          <input
            type="password"
            autoComplete="new-password"
            placeholder={options.passwordPlaceholder ?? "Leave blank to generate one"}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </FormField>
      )}
      <FormField label="Years of experience" hint="Shown on the Help Me coach card">
      <input
        type="number"
        min={0}
        placeholder="e.g. 8"
        value={form.experienceYears}
        onChange={(e) => setForm((prev) => ({ ...prev, experienceYears: e.target.value }))}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      </FormField>
      <input
        type="text"
        placeholder="Languages (comma-separated)"
        value={form.languages}
        onChange={(e) => setForm((prev) => ({ ...prev, languages: e.target.value }))}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:col-span-2"
      />
      <input
        type="text"
        placeholder="Availability (e.g. Mon 09:00, Wed 14:00)"
        value={form.availability}
        onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value }))}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:col-span-2"
      />
      <textarea
        placeholder="Short bio"
        value={form.bio}
        onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
        rows={2}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:col-span-2"
      />
      <textarea
        placeholder="About (full description)"
        value={form.about}
        onChange={(e) => setForm((prev) => ({ ...prev, about: e.target.value }))}
        rows={3}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:col-span-2"
      />
      <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
        />
        Active (visible on Help Me page)
      </label>
    </>
  );

  if (isForbidden) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-600 dark:text-amber-300" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-amber-900 dark:text-amber-200">Coaches Admin Access Denied</h1>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Only the designated coaches admin account can manage life coaches.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-teal-100 p-3 dark:bg-teal-900/30">
            <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Coaches</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add life coaches manually and activate or deactivate them on the Help Me page.
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
          <UserPlus className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Coach</h2>
        </div>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleCreateSubmit}>
          {renderFormFields(createForm, setCreateForm, { includePassword: true })}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImage}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              Add coach
            </button>
          </div>
        </form>
      </section>

      {editingCoach && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm dark:border-blue-800 dark:bg-blue-900/10">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit {editingCoach.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleEditSubmit}>
            {renderFormFields(editForm, setEditForm, {
              includePassword: true,
              passwordLabel: "Reset password",
              passwordHint:
                "Optional. Leave blank to keep the current coach password. Enter a new password to reset it and send a secure setup email.",
              passwordPlaceholder: "Leave blank to keep current password",
            })}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting || isUploadingImage}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Save changes
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          All coaches ({coaches.length})
        </h2>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading coaches...</p>
        ) : coaches.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No coaches yet.</p>
        ) : (
          <div className="space-y-3">
            {coaches.map((coach) => (
              <article
                key={coach.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={resolveCounselorImage(coach.image)}
                    alt={coach.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{coach.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          coach.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {coach.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{coach.specialty}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{coach.location}</p>
                    {coach.linkedUserEmail && (
                      <p className="text-xs text-teal-600 dark:text-teal-400">
                        Login: {coach.linkedUserEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(coach)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    {coach.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-500" />
                    )}
                    {coach.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(coach)}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(coach)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
