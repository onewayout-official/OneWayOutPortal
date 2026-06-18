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
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string | null;
};

export type CounselorAppointmentRow = {
  id: string;
  counselor_id: string;
  user_id: string;
  appointment_date: string;
  appointment_time: string;
  meeting_link: string;
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
    image: row.image ?? "",
    isActive: Boolean(row.is_active),
    linkedUserId: row.linked_user_id ?? null,
  };
}

export function appointmentFromRow(
  row: CounselorAppointmentRow,
  user?: { name?: string | null; email?: string | null; phone?: string | null }
): CounselorAppointment {
  return {
    id: row.id,
    counselorId: row.counselor_id,
    userId: row.user_id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    meetingLink: row.meeting_link,
    status: row.status,
    createdAt: row.created_at,
    userName: user?.name ?? undefined,
    userEmail: user?.email ?? undefined,
    userPhone: user?.phone ?? null,
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
