import { NextRequest, NextResponse } from "next/server";
import { formatE164, isValidPhone } from "@/lib/phone";
import { verifyStoredOTP } from "@/lib/otp";
import { getSupabaseAdmin, getSupabaseServerAnon } from "@/lib/supabaseAdmin";
import { getAuthUserFromRequest } from "@/lib/requestAuth";
import {
  findSignupConflict,
  findUserByPhone,
  SIGNUP_PHONE_TAKEN_ERROR,
} from "@/lib/authIdentity";

interface VerifyBody {
  phone?: string;
  code?: string;
  metadata?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  mode?: "login" | "signup" | "link";
}

function phonePlaceholderEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@phone.onewayout.local`;
}

function isDuplicateAuthError(message?: string): boolean {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("already") ||
    normalized.includes("duplicate") ||
    normalized.includes("registered")
  );
}

async function updateSignupUser(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
  details: {
    e164: string;
    name: string;
    firstName: string;
    lastName: string;
    email?: string;
  }
): Promise<void> {
  const { e164, name, firstName, lastName, email } = details;
  const { data: authUserData } = await admin.auth.admin.getUserById(userId);
  const existingMeta = (authUserData.user?.user_metadata ?? {}) as Record<string, unknown>;

  const authUpdates: {
    phone: string;
    phone_confirm: boolean;
    user_metadata: Record<string, unknown>;
    email?: string;
    email_confirm?: boolean;
  } = {
    phone: e164,
    phone_confirm: true,
    user_metadata: {
      ...existingMeta,
      phone: e164,
      ...(name ? { name } : {}),
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(email ? { email } : {}),
    },
  };

  const existingEmail = authUserData.user?.email?.trim();
  const hasPlaceholderEmail =
    !existingEmail || existingEmail.endsWith("@phone.onewayout.local");
  if (email && hasPlaceholderEmail) {
    authUpdates.email = email;
    authUpdates.email_confirm = false;
  }

  await admin.auth.admin.updateUserById(userId, authUpdates);

  await admin
    .from("profiles")
    .update({
      ...(name ? { name } : {}),
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(email ? { email } : {}),
      phone: e164,
    })
    .eq("id", userId);
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
  const anon = getSupabaseServerAnon();
  if (!admin || !anon) {
    return { success: false as const, error: "Server auth is not configured." };
  }

  const email = await ensureUserEmail(admin, userId, phone, preferredEmail);

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return {
      success: false as const,
      error: linkError?.message ?? "Failed to create session.",
    };
  }

  let sessionData;
  let verifyError;

  ({ data: sessionData, error: verifyError } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  }));

  if (verifyError || !sessionData?.session) {
    ({ data: sessionData, error: verifyError } = await anon.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    }));
  }

  if (verifyError || !sessionData?.session) {
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

  // Link a verified phone to the currently signed-in user (e.g. Google OAuth).
  if (mode === "link") {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to add a phone number." },
        { status: 401 }
      );
    }

    const phoneOwner = await findUserByPhone(admin, e164);
    if (phoneOwner && phoneOwner.id !== user.id) {
      return NextResponse.json({ error: SIGNUP_PHONE_TAKEN_ERROR }, { status: 409 });
    }

    const { data: authUserData } = await admin.auth.admin.getUserById(user.id);
    const existingMeta = (authUserData.user?.user_metadata ?? {}) as Record<string, unknown>;

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(user.id, {
      phone: e164,
      phone_confirm: true,
      user_metadata: {
        ...existingMeta,
        phone: e164,
      },
    });

    if (updateAuthError) {
      return NextResponse.json(
        { error: updateAuthError.message ?? "Failed to update account phone." },
        { status: 500 }
      );
    }

    const { error: updateProfileError } = await admin
      .from("profiles")
      .update({ phone: e164 })
      .eq("id", user.id);

    if (updateProfileError) {
      if (
        updateProfileError.code === "23505" &&
        updateProfileError.message.includes("profiles_phone_unique")
      ) {
        return NextResponse.json({ error: SIGNUP_PHONE_TAKEN_ERROR }, { status: 409 });
      }
      return NextResponse.json(
        { error: updateProfileError.message ?? "Failed to save phone number." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, linked: true });
  }

  const metadata = body.metadata ?? {};
  const firstName = metadata.firstName?.trim() ?? "";
  const lastName = metadata.lastName?.trim() ?? "";
  const name =
    metadata.name?.trim() ||
    `${firstName} ${lastName}`.trim() ||
    "";
  const email = metadata.email?.trim() || undefined;

  let existingUser = await findUserByPhone(admin, e164);
  let createdThisRequest = false;

  if (mode === "signup") {
    const conflict = await findSignupConflict(
      {
        phone: existingUser ? undefined : e164,
        email,
        excludeUserId: existingUser?.id,
      },
      admin
    );
    if (conflict) {
      return NextResponse.json({ error: conflict.error }, { status: 409 });
    }
  }

  if (mode === "login" && !existingUser) {
    return NextResponse.json(
      { error: "No account found for this number. Please create an account first." },
      { status: 404 }
    );
  }

  if (mode === "signup") {
    if (existingUser) {
      await updateSignupUser(admin, existingUser.id, {
        e164,
        name,
        firstName,
        lastName,
        email,
      });
    } else {
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
      } else {
        const placeholder = phonePlaceholderEmail(e164);
        createPayload.email = placeholder;
        createPayload.email_confirm = true;
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser(createPayload);

      if (createError || !created.user) {
        if (isDuplicateAuthError(createError?.message)) {
          existingUser = await findUserByPhone(admin, e164);
          if (existingUser) {
            await updateSignupUser(admin, existingUser.id, {
              e164,
              name,
              firstName,
              lastName,
              email,
            });
          }
        }

        if (!existingUser) {
          const duplicateEmail = createError?.message?.toLowerCase().includes("email");
          return NextResponse.json(
            {
              error: duplicateEmail
                ? "This email address is already registered. Please sign in instead."
                : createError?.message ?? "Failed to create account.",
            },
            { status: duplicateEmail ? 409 : 500 }
          );
        }
      } else {
        existingUser = created.user;
        createdThisRequest = true;

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
    }
  }

  if (!existingUser) {
    return NextResponse.json({ error: "Failed to resolve account." }, { status: 500 });
  }

  const sessionResult = await mintSessionForUser(existingUser.id, e164, email);
  if (!sessionResult.success) {
    if (createdThisRequest) {
      await admin.auth.admin.deleteUser(existingUser.id);
    }
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
