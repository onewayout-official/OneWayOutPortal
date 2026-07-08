"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Save, UserCog } from "lucide-react";
import { Counselor, resolveCounselorImage, splitCounselorName } from "@/lib/counselors";
import { getAuthHeader } from "@/lib/authHeader";
import AvailabilitySlotBuilder from "@/components/AvailabilitySlotBuilder";

type CoachProfileFormState = {
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
};

const EMPTY_FORM: CoachProfileFormState = {
  firstName: "",
  lastName: "",
  specialty: "",
  bio: "",
  about: "",
  experienceYears: "",
  languages: "",
  location: "",
  availability: "",
  image: "",
};

function coachToForm(coach: Counselor): CoachProfileFormState {
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
  };
}

function formToPayload(form: CoachProfileFormState) {
  return {
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

export default function CoachProfileEditor() {
  const [form, setForm] = useState<CoachProfileFormState>(EMPTY_FORM);
  const [previewImage, setPreviewImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const headers = await getAuthHeader();
        const response = await fetch("/api/coach/profile", { method: "GET", headers });
        const json = (await response.json()) as { coach?: Counselor; error?: string };

        if (!response.ok || !json.coach) {
          throw new Error(json.error ?? "Failed to load profile.");
        }

        if (cancelled) return;
        setForm(coachToForm(json.coach));
        setPreviewImage(json.coach.image);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/coach/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify(formToPayload(form)),
      });
      const json = (await response.json()) as { coach?: Counselor; error?: string };

      if (!response.ok || !json.coach) {
        throw new Error(json.error ?? "Failed to save profile.");
      }

      setForm(coachToForm(json.coach));
      setPreviewImage(json.coach.image);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setSuccess(null);

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

      const response = await fetch("/api/coach/profile/image", {
        method: "POST",
        headers,
        body: formData,
      });
      const json = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !json.url) {
        throw new Error(json.error ?? "Failed to upload profile image.");
      }

      setForm((prev) => ({ ...prev, image: json.url ?? prev.image }));
      setPreviewImage(json.url);
      setSuccess("Profile image attached. Save your profile to keep it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-teal-100 p-3 dark:bg-teal-900/30">
            <UserCog className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Coach Profile</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update the details clients see when they view your counselor profile.
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

      <form
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="First name">
            <input
              required
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Last name">
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Specialty">
            <input
              type="text"
              value={form.specialty}
              onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Location">
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Years of experience">
            <input
              type="number"
              min={0}
              value={form.experienceYears}
              onChange={(e) => setForm((prev) => ({ ...prev, experienceYears: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Profile image" hint="Paste an image URL or attach a JPEG file.">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="url"
                value={form.image}
                onBlur={() => setPreviewImage(resolveCounselorImage(form.image))}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                className={inputClass}
              />
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-teal-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-900/20">
                {isUploadingImage ? "Uploading..." : "Attach JPEG"}
                <input
                  type="file"
                  accept="image/jpeg,.jpg,.jpeg"
                  disabled={isUploadingImage}
                  onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            </div>
          </FormField>
          <FormField label="Languages" hint="Comma-separated, e.g. English, Afrikaans" className="sm:col-span-2">
            <input
              type="text"
              value={form.languages}
              onChange={(e) => setForm((prev) => ({ ...prev, languages: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField
            label="Availability"
            hint="Select a weekday and time, then add each recurring meeting slot."
            className="sm:col-span-2"
          >
            <AvailabilitySlotBuilder
              value={form.availability}
              onChange={(availability) => setForm((prev) => ({ ...prev, availability }))}
            />
          </FormField>
          <FormField label="Short bio" className="sm:col-span-2">
            <textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="About" className="sm:col-span-2">
            <textarea
              rows={4}
              value={form.about}
              onChange={(e) => setForm((prev) => ({ ...prev, about: e.target.value }))}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={resolveCounselorImage(previewImage || form.image)}
              alt="Coach profile preview"
              width={48}
              height={48}
              unoptimized
              className="h-12 w-12 rounded-full object-cover"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This preview uses your current profile image URL.
            </p>
          </div>
          <button
            type="submit"
            disabled={isSaving || isUploadingImage}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
