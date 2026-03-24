import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { findUserByIdAndRole } from "@/lib/authTables";

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return req.cookies.get("token")?.value || null;
};

export const requireApiUser = async (req, allowedRoles = []) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return {
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const role = String(payload?.role || "").toLowerCase();
    const id = payload?.id;

    if (!id || !role) {
      return {
        response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
        user: null,
      };
    }

    if (allowedRoles.length && !allowedRoles.includes(role)) {
      return {
        response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
        user: null,
      };
    }

    const user = await findUserByIdAndRole({ id, role });
    if (!user) {
      return {
        response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
        user: null,
      };
    }

    return { response: null, user };
  } catch {
    return {
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }
};

export const isSuperAdmin = (user) => String(user?.role || "").toLowerCase() === "super_admin";
export const isHospitalAdmin = (user) => String(user?.role || "").toLowerCase() === "hospital_admin";
