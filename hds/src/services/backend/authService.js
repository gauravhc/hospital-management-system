import apiClient from "@/lib/apiClient";
import backendUrl from "@/lib/backendUrl";

export const authService = {
  async login(credentials) {
    const res = await apiClient.post(backendUrl("/api/auth/login"), credentials);
    const data = res.data?.data || res.data;

    if (data?.token && data?.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
};
