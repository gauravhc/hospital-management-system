"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/api";

const normalizeRole = (value) => {
  const rawRole = String(value || "").trim().toLowerCase();

  if (rawRole === "administrator" || rawRole === "admin") return "hospital_admin";
  if (rawRole === "superadmin" || rawRole === "super-admin") return "super_admin";
  if (
    rawRole === "reception" ||
    rawRole === "receptionist" ||
    rawRole === "register"
  ) {
    return "register";
  }
  if (rawRole === "labtechnician" || rawRole === "lab_technician") return "lab";
  if (rawRole === "insurance" || rawRole === "insurance_manager" || rawRole === "insurancemanager") return "insurance";
  if (rawRole === "inventorymanager" || rawRole === "inventory_manager" || rawRole === "inventory") return "inventory";
  if (rawRole === "hrmanager" || rawRole === "hr_manager" || rawRole === "hr") return "hr";

  return rawRole;
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await authService.login({
        email: username,
        password,
      });

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[login] response:", response);
      }

      if (!response?.token || !response?.user) {
        throw new Error("Invalid login response");
      }

      const normalizedRole = normalizeRole(response.user.role);
      const redirectPath = (() => {
        switch (normalizedRole) {
          case "super_admin":
            return "/super-admin";
          case "hospital_admin":
            return "/admin";
          case "doctor":
            return "/doctor";
          case "lab":
            return "/lab";
          case "pharmacist":
            return "/pharmacy";
          case "nurse":
            return "/nurse";
          case "patient":
            return "/patient";
          case "inventory":
            return "/inventory";
          case "register":
            return "/register";
          case "accountant":
            return "/accountant";
          case "hr":
            return "/hr";
          case "insurance":
            return "/insurance";
          default:
            return "/";
        }
      })();

      login({
        token: response.token,
        role: normalizedRole,
        username: response.user.email,
        email: response.user.email,
        id: response.user.id,
        hospitalId: response.user.hospital_id,
        name: response.user.name,
        profile_image: response.user.profile_image,
        profile_image_url: response.user.profile_image_url,
      });

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[login] normalized role:", normalizedRole);
        // eslint-disable-next-line no-console
        console.log("[login] token stored:", Boolean(localStorage.getItem("token")));
        // eslint-disable-next-line no-console
        console.log("[login] role stored:", localStorage.getItem("role"));
        // eslint-disable-next-line no-console
        console.log("[login] redirect path:", redirectPath);
      }

      router.replace(redirectPath);
    } catch (err) {
      console.error("Login Error:", err);
      setMessage(
        err?.response?.data?.message ||
          err.message ||
          "Invalid credentials"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-900 text-white p-12">
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-extrabold mb-6">
            Medicore<span className="text-blue-200"> vault</span>
          </h1>
          <h2 className="text-3xl font-bold mb-4">
            Next Generation Healthcare Management
          </h2>
          <p className="text-blue-100 max-w-md">
            Streamline hospital operations and manage resources efficiently.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label>Email</label>
              <input
                type="email"
                required
                className="w-full py-3 px-4 border rounded-lg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label>Password</label>
              <input
                type="password"
                required
                className="w-full py-3 px-4 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {message && (
              <div className="text-red-600 bg-red-50 p-3 rounded">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg"
            >
              {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-600 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
