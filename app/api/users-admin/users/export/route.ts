import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllPlatformUsers,
  getUsersAdminContext,
  parseUserSortParams,
} from "@/lib/usersAdminApi";

export async function GET(request: NextRequest) {
  const context = await getUsersAdminContext(request);
  if (context instanceof NextResponse) return context;

  const searchParams = request.nextUrl.searchParams;
  const { sortBy, sortOrder } = parseUserSortParams(
    searchParams.get("sortBy"),
    searchParams.get("sortOrder")
  );

  try {
    const users = await fetchAllPlatformUsers(context.adminClient, { sortBy, sortOrder });

    return NextResponse.json({
      users,
      exportedAt: new Date().toISOString(),
      total: users.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
