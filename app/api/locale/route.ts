import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const VALID_LOCALES = ["en", "nl"];

export async function POST(req: Request) {
  const { locale } = await req.json();
  if (!VALID_LOCALES.includes(locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return new NextResponse(null, { status: 204 });
}
