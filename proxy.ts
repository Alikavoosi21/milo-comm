import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get("milo_owner")) {
    response.cookies.set("milo_owner", crypto.randomUUID(), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

