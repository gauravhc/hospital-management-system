import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_ROUTES = {
  "/super-admin": ["super_admin"],
  "/admin": ["hospital_admin", "super_admin"],
  "/doctor": ["doctor", "super_admin"],
  "/patient": ["patient", "super_admin"],
  "/nurse": ["nurse", "super_admin"],
  "/lab": ["lab", "super_admin"],
  "/inventory": ["inventory", "super_admin"],
  "/pharmacy": ["pharmacist", "super_admin"],
  "/register": ["register", "super_admin", "hospital_admin"],
};

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  const protectedRoute = Object.keys(PROTECTED_ROUTES).find((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!protectedRoute) return NextResponse.next();

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "supersecret123"
    );

    const { payload } = await jwtVerify(token, secret);

    const allowedRoles = PROTECTED_ROUTES[protectedRoute];

    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();

  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
