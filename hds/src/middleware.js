import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_ROUTES = {
  "/super-admin": ["super_admin"],
  "/admin": ["hospital_admin", "super_admin"],
  "/doctor": ["doctor", "super_admin"],
  "/patient": ["patient", "super_admin"],
  "/nurse": ["nurse", "super_admin"],
  "/lab": ["lab", "labtechnician", "super_admin"],
  "/inventory": ["inventory", "inventorymanager", "pharmacist", "super_admin"],
  "/pharmacy": ["pharmacist", "admin", "hospital_admin", "super_admin"],
  "/hr": ["hr", "hrmanager", "admin", "hospital_admin", "super_admin"],
  "/register": [
    "register",
    "reception",
    "receptionist",
    "admin",
    "hospital_admin",
    "super_admin",
  ],
  "/accountant": ["accountant", "admin", "hospital_admin", "super_admin"],
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
    const secretValue = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;
    if (!secretValue) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const secret = new TextEncoder().encode(secretValue);

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
