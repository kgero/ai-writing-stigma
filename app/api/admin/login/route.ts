import { NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/cookies";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || body.password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
