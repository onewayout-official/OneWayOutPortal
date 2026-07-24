import { NextRequest, NextResponse } from "next/server";
import {
  counselorFromRow,
  counselorNameFromBody,
  resolveCounselorImage,
  type CounselorRow,
} from "@/lib/counselors";
import { getCoachContext } from "@/lib/coachApi";

function arrayFromBodyValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const context = await getCoachContext(request);
  if (context instanceof NextResponse) return context;

  const { data, error } = await context.adminClient
    .from("counselors")
    .select("*")
    .eq("id", context.counselorId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Coach profile not found." }, { status: 404 });
  }

  return NextResponse.json({ coach: counselorFromRow(data as CounselorRow) });
}

export async function PATCH(request: NextRequest) {
  const context = await getCoachContext(request);
  if (context instanceof NextResponse) return context;

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

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
  if (body.image !== undefined) updates.image = resolveCounselorImage(String(body.image));
  if (body.languages !== undefined) updates.languages = arrayFromBodyValue(body.languages);
  if (body.availability !== undefined) updates.availability = arrayFromBodyValue(body.availability);

  const { data, error } = await context.adminClient
    .from("counselors")
    .update(updates)
    .eq("id", context.counselorId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Coach profile not found." }, { status: 404 });
  }

  return NextResponse.json({ coach: counselorFromRow(data as CounselorRow) });
}
