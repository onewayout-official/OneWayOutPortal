import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { counselorFromRow, slugifyCounselorId, type CounselorRow } from "@/lib/counselors";
import { getCoachesAdminContext } from "@/lib/coachesAdminApi";

async function resolveLinkedUserId(
  adminClient: SupabaseClient,
  linkedUserEmail: unknown
): Promise<{ linkedUserId: string | null } | { error: string }> {
  const email = String(linkedUserEmail ?? "").trim().toLowerCase();
  if (!email) {
    return { linkedUserId: null };
  }

  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!profile) {
    return { error: "No user found with that email." };
  }

  if ((profile as { role?: string }).role !== "counselor") {
    return { error: "That user must have the counselor role before linking." };
  }

  return { linkedUserId: (profile as { id: string }).id };
}

async function enrichCoachesWithEmails(
  adminClient: SupabaseClient,
  rows: CounselorRow[]
) {
  const linkedIds = rows
    .map((row) => row.linked_user_id)
    .filter((id): id is string => Boolean(id));

  const emailByUserId = new Map<string, string>();
  if (linkedIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, email")
      .in("id", linkedIds);

    for (const profile of profiles ?? []) {
      emailByUserId.set(
        (profile as { id: string }).id,
        (profile as { email?: string }).email ?? ""
      );
    }
  }

  return rows.map((row) => ({
    ...counselorFromRow(row),
    linkedUserEmail: row.linked_user_id ? emailByUserId.get(row.linked_user_id) ?? null : null,
  }));
}

function toRowPayload(body: Record<string, unknown>, id?: string) {
  const name = String(body.name ?? "").trim();
  if (!name) return { error: "Name is required." };

  const languages = Array.isArray(body.languages)
    ? body.languages.map((entry) => String(entry).trim()).filter(Boolean)
    : String(body.languages ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

  const availability = Array.isArray(body.availability)
    ? body.availability.map((entry) => String(entry).trim()).filter(Boolean)
    : String(body.availability ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

  return {
    row: {
      id: id ?? slugifyCounselorId(name),
      name,
      title: String(body.title ?? "Life Coach/Counsellor").trim() || "Life Coach/Counsellor",
      specialty: String(body.specialty ?? "").trim(),
      bio: String(body.bio ?? "").trim(),
      about: String(body.about ?? "").trim(),
      experience_years: Number(body.experienceYears ?? 0),
      languages,
      location: String(body.location ?? "").trim(),
      availability,
      rating: Number(body.rating ?? 0),
      sessions_completed: Number(body.sessionsCompleted ?? 0),
      image: String(body.image ?? "").trim(),
      is_active: Boolean(body.isActive),
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request: NextRequest) {
  const context = await getCoachesAdminContext(request);
  if (context instanceof NextResponse) return context;

  const { data, error } = await context.adminClient
    .from("counselors")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const coaches = await enrichCoachesWithEmails(context.adminClient, (data ?? []) as CounselorRow[]);
  return NextResponse.json({ coaches });
}

export async function POST(request: NextRequest) {
  const context = await getCoachesAdminContext(request);
  if (context instanceof NextResponse) return context;

  const body = (await request.json()) as Record<string, unknown>;
  const payload = toRowPayload(body);
  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const linked = await resolveLinkedUserId(context.adminClient, body.linkedUserEmail);
  if ("error" in linked) {
    return NextResponse.json({ error: linked.error }, { status: 400 });
  }

  const row = {
    ...payload.row,
    linked_user_id: linked.linkedUserId,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await context.adminClient
    .from("counselors")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    coach: {
      ...counselorFromRow(data as CounselorRow),
      linkedUserEmail: body.linkedUserEmail ? String(body.linkedUserEmail).trim().toLowerCase() : null,
    },
  }, { status: 201 });
}
