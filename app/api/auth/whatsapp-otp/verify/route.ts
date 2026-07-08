import { NextRequest, NextResponse } from "next/server";
import { formatE164, isValidPhone } from "@/lib/phone";
import { verifyStoredOTP } from "@/lib/otp";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface VerifyBody {
  phone?: string;
  code?: string;
  metadata?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  mode?: "login" | "signup";
}

async function findUserByPhone(phone: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("phone", phone)
    .maybeSingle();

  if (profile?.id) {
    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    if (userData.user) return userData.user;
  }

  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) break;

    const match = data.users.find((u) => u.phone === phone);
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

function phonePlaceholderEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@phone.onewayout.local`;
}

async function ensureUserEmail(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
  phone: string,
  preferredEmail?: string
): Promise<string> {
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const existingEmail = userData.user?.email?.trim();

  if (existingEmail) {
    return existingEmail;
  }

  if (preferredEmail) {
    await admin.auth.admin.updateUserById(userId, {
      email: preferredEmail,
      email_confirm: false,
    });
    return preferredEmail;
  }

  const placeholder = phonePlaceholderEmail(phone);
  await admin.auth.admin.updateUserById(userId, {
    email: placeholder,
    email_confirm: true,
  });
  return placeholder;
}

async function mintSessionForUser(userId: string, phone: string, preferredEmail?: string) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { success: false as const, error: "Server auth is not configured." };
  }

  const email = await ensureUserEmail(admin, userId, phone, preferredEmail);

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return {
      success: false as const,
      error: linkError?.message ?? "Failed to create session.",
    };
  }

  const { data: sessionData, error: verifyError } = await admin.auth.verifyOtp({
    email,
    token: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError || !sessionData.session) {
    return {
      success: false as const,
      error: verifyError?.message ?? "Failed to establish session.",
    };
  }

  return {
    success: true as const,
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    user: sessionData.session.user,
  };
}

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server auth is not configured." }, { status: 503 });
  }

  let body: VerifyBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const e164 = formatE164(body.phone);
  const code = body.code?.trim();

  if (!e164 || !isValidPhone(e164)) {
    return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Please enter a valid 6-digit code." }, { status: 400 });
  }

  const verifyResult = await verifyStoredOTP(e164, code);
  if (!verifyResult.success) {
    return NextResponse.json(
      { error: verifyResult.error ?? "Invalid OTP." },
      { status: 401 }
    );
  }

  const mode = body.mode ?? "login";
  const metadata = body.metadata ?? {};
  const firstName = metadata.firstName?.trim() ?? "";
  const lastName = metadata.lastName?.trim() ?? "";
  const name =
    metadata.name?.trim() ||
    `${firstName} ${lastName}`.trim() ||
    "";
  const email = metadata.email?.trim() || undefined;

  let existingUser = await findUserByPhone(e164);

  if (mode === "signup" && existingUser) {
    return NextResponse.json(
      { error: "This number is already registered. Please sign in instead." },
      { status: 409 }
    );
  }

  if (mode === "login" && !existingUser) {
    return NextResponse.json(
      { error: "No account found for this number. Please create an account first." },
      { status: 404 }
    );
  }

  if (!existingUser) {
    const createPayload: {
      phone: string;
      phone_confirm: boolean;
      email?: string;
      email_confirm?: boolean;
      user_metadata: Record<string, string>;
    } = {
      phone: e164,
      phone_confirm: true,
      user_metadata: {
        phone: e164,
        ...(name ? { name } : {}),
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      },
    };

    if (email) {
      createPayload.email = email;
      createPayload.email_confirm = false;
      createPayload.user_metadata.email = email;
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser(createPayload);

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create account." },
        { status: 500 }
      );
    }

    existingUser = created.user;

    if (email || name || e164) {
      await admin
        .from("profiles")
        .update({
          ...(name ? { name } : {}),
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
          ...(email ? { email } : {}),
          phone: e164,
        })
        .eq("id", created.user.id);
    }
  }

  const sessionResult = await mintSessionForUser(existingUser.id, e164, email);
  if (!sessionResult.success) {
    return NextResponse.json(
      { error: sessionResult.error ?? "Failed to sign in." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    access_token: sessionResult.access_token,
    refresh_token: sessionResult.refresh_token,
    user: sessionResult.user,
  });
}
