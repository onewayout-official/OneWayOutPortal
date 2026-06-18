import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { counselorFromRow, type CounselorRow } from "@/lib/counselors";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getCoachesAdminContext(request);
  if (context instanceof NextResponse) return context;

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.specialty !== undefined) updates.specialty = String(body.specialty).trim();
  if (body.bio !== undefined) updates.bio = String(body.bio).trim();
  if (body.about !== undefined) updates.about = String(body.about).trim();
  if (body.experienceYears !== undefined) updates.experience_years = Number(body.experienceYears);
  if (body.location !== undefined) updates.location = String(body.location).trim();
  if (body.rating !== undefined) updates.rating = Number(body.rating);
  if (body.sessionsCompleted !== undefined) {
    updates.sessions_completed = Number(body.sessionsCompleted);
  }
  if (body.image !== undefined) updates.image = String(body.image).trim();
  if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);

  if (body.linkedUserEmail !== undefined) {
    const linked = await resolveLinkedUserId(context.adminClient, body.linkedUserEmail);
    if ("error" in linked) {
      return NextResponse.json({ error: linked.error }, { status: 400 });
    }
    updates.linked_user_id = linked.linkedUserId;
  }

  if (body.languages !== undefined) {
    updates.languages = Array.isArray(body.languages)
      ? body.languages.map((entry) => String(entry).trim()).filter(Boolean)
      : String(body.languages)
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
  }

  if (body.availability !== undefined) {
    updates.availability = Array.isArray(body.availability)
      ? body.availability.map((entry) => String(entry).trim()).filter(Boolean)
      : String(body.availability)
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
  }

  const { data, error } = await context.adminClient
    .from("counselors")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Coach not found." }, { status: 404 });
  }

  return NextResponse.json({ coach: counselorFromRow(data as CounselorRow) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getCoachesAdminContext(request);
  if (context instanceof NextResponse) return context;

  const { id } = await params;

  const { error } = await context.adminClient.from("counselors").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
