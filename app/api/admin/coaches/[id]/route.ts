import { NextRequest, NextResponse } from "next/server";
import { counselorFromRow, counselorNameFromBody, resolveCounselorImage, type CounselorRow } from "@/lib/counselors";
import { getCoachesAdminContext } from "@/lib/coachesAdminApi";
import { resolveOrCreateCounselorUser } from "@/lib/resolveCounselorUser";

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
  let accountCreated = false;

  if (body.firstName !== undefined || body.lastName !== undefined || body.name !== undefined) {
    const nameResult = counselorNameFromBody(body);
    if ("error" in nameResult) {
      return NextResponse.json({ error: nameResult.error }, { status: 400 });
    }
    updates.name = nameResult.name;
  }
  if (body.specialty !== undefined) updates.specialty = String(body.specialty).trim();
  if (body.bio !== undefined) updates.bio = String(body.bio).trim();
  if (body.about !== undefined) updates.about = String(body.about).trim();
  if (body.experienceYears !== undefined) updates.experience_years = Number(body.experienceYears);
  if (body.location !== undefined) updates.location = String(body.location).trim();
  if (body.rating !== undefined) updates.rating = Number(body.rating);
  if (body.sessionsCompleted !== undefined) {
    updates.sessions_completed = Number(body.sessionsCompleted);
  }
  if (body.image !== undefined) updates.image = resolveCounselorImage(String(body.image));
  if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);

  if (body.linkedUserEmail !== undefined) {
    const coachName =
      typeof updates.name === "string"
        ? updates.name
        : ((
            await context.adminClient.from("counselors").select("name").eq("id", id).maybeSingle()
          ).data as { name?: string } | null)?.name ?? "";

    const linked = await resolveOrCreateCounselorUser(
      context.adminClient,
      body.linkedUserEmail,
      coachName
    );
    if ("error" in linked) {
      return NextResponse.json({ error: linked.error }, { status: 400 });
    }
    updates.linked_user_id = "linkedUserId" in linked ? linked.linkedUserId : null;
    accountCreated = "accountCreated" in linked ? linked.accountCreated : false;
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

  return NextResponse.json({
    coach: counselorFromRow(data as CounselorRow),
    accountCreated,
  });
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
