"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { authService } from "@/services/api";

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

      if (!response?.token || !response?.user) {
        throw new Error("Invalid login response");
      }

      let role = response.user.role;

      // Normalize roles
      if (role === "administrator" || role === "admin") role = "hospital_admin";
      if (role === "superadmin" || role === "super-admin") role = "super_admin";

      login({
        token: response.token,
        role,
        username: response.user.email,
        email: response.user.email,
        id: response.user.id,
        hospitalId: response.user.hospital_id,
        name: response.user.name,
        profile_image: response.user.profile_image,
        profile_image_url: response.user.profile_image_url,
      });

      // ✅ Redirect ONLY HERE
      switch (role) {

  case "super_admin":
    router.replace("/super-admin");
    break;

  case "hospital_admin":
    router.replace("/admin");
    break;

  case "doctor":
    router.replace("/doctor");
    break;

  case "nurse":
    router.replace("/nurse");
    break;

  case "patient":
    router.replace("/patient");
    break;

  default:
    router.replace("/");
}
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
            Dscape<span className="text-blue-200">.AI</span>
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
              {isLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-center">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-blue-600 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
