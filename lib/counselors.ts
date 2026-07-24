export const DEFAULT_COUNSELOR_IMAGE =
  "https://pixabay.com/get/g93a39adb6c5f5f1072cdbc268efb023d82e6b704281f66a6e63c5f09f7b7df1edc9ed568f0ea2eda731be63ca9d37af01e7217fb389b11d5e8fd6b4bb3642aea233905aed946de22d8c78e878f23802c.svg?attachment=";

export function resolveCounselorImage(image?: string | null): string {
  const trimmed = (image ?? "").trim();
  return trimmed || DEFAULT_COUNSELOR_IMAGE;
}

export type Counselor = {
  id: string;
  name: string;
  title: string;
  specialty: string;
  bio: string;
  about: string;
  experienceYears: number;
  languages: string[];
  location: string;
  availability: string[];
  rating: number;
  sessionsCompleted: number;
  image: string;
  isActive?: boolean;
  linkedUserId?: string | null;
  linkedUserEmail?: string | null;
};

export type CounselorRow = {
  id: string;
  name: string;
  title: string;
  specialty: string;
  bio: string;
  about: string;
  experience_years: number;
  languages: string[];
  location: string;
  availability: string[];
  rating: number;
  sessions_completed: number;
  image: string;
  is_active: boolean;
  linked_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CounselorAppointment = {
  id: string;
  counselorId: string;
  userId: string;
  appointmentDate: string;
  appointmentTime: string;
  meetingLink: string;
  outlookEventId?: string | null;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string | null;
  counselorName?: string;
  counselorTitle?: string;
  counselorSpecialty?: string;
  counselorImage?: string;
  counselorLocation?: string;
};

export type CounselorAppointmentRow = {
  id: string;
  counselor_id: string;
  user_id: string;
  appointment_date: string;
  appointment_time: string;
  meeting_link: string;
  outlook_event_id?: string | null;
  status: "scheduled" | "completed" | "cancelled";
  created_at: string;
};

export function counselorFromRow(row: CounselorRow): Counselor {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    specialty: row.specialty,
    bio: row.bio,
    about: row.about,
    experienceYears: Number(row.experience_years ?? 0),
    languages: row.languages ?? [],
    location: row.location ?? "",
    availability: row.availability ?? [],
    rating: Number(row.rating ?? 0),
    sessionsCompleted: Number(row.sessions_completed ?? 0),
    image: resolveCounselorImage(row.image),
    isActive: Boolean(row.is_active),
    linkedUserId: row.linked_user_id ?? null,
  };
}

export function appointmentFromRow(
  row: CounselorAppointmentRow,
  user?: { name?: string | null; email?: string | null; phone?: string | null },
  counselor?: {
    name?: string | null;
    title?: string | null;
    specialty?: string | null;
    image?: string | null;
    location?: string | null;
  }
): CounselorAppointment {
  return {
    id: row.id,
    counselorId: row.counselor_id,
    userId: row.user_id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    meetingLink: row.meeting_link,
    outlookEventId: row.outlook_event_id ?? null,
    status: row.status,
    createdAt: row.created_at,
    userName: user?.name ?? undefined,
    userEmail: user?.email ?? undefined,
    userPhone: user?.phone ?? null,
    counselorName: counselor?.name ?? undefined,
    counselorTitle: counselor?.title ?? undefined,
    counselorSpecialty: counselor?.specialty ?? undefined,
    counselorImage: counselor ? resolveCounselorImage(counselor.image) : undefined,
    counselorLocation: counselor?.location ?? undefined,
  };
}

export function slugifyCounselorId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Date.now().toString(36).slice(-4);
  return base ? `${base}-${suffix}` : `coach-${suffix}`;
}

export function splitCounselorName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function combineCounselorName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function counselorNameFromBody(body: Record<string, unknown>):
  | { name: string }
  | { error: string } {
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const legacyName = String(body.name ?? "").trim();

  if (firstName || lastName) {
    if (!firstName) {
      return { error: "First name is required." };
    }
    return { name: combineCounselorName(firstName, lastName) };
  }

  if (legacyName) {
    return { name: legacyName };
  }

  return { error: "First name is required." };
}
