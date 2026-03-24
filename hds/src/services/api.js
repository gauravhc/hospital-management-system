import apiClient from "@/lib/apiClient";
import backendUrl, { API_BASE_URL } from "@/lib/backendUrl";

export const API_URL = API_BASE_URL;

export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post(backendUrl("/api/auth/login"), credentials);
    const data = response.data?.data || response.data;

    if (typeof window !== "undefined" && data?.token && data?.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  register: async (userData) => {
    const response = await apiClient.post(backendUrl("/api/auth/register"), userData);
    return response.data?.data || response.data;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },

  getCurrentUser: () => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },
};

export const patientService = {
  getProfile: async () => {
    const response = await apiClient.get(backendUrl("/api/patients/profile"));
    return response.data;
  },

  getAppointments: async () => {
    const response = await apiClient.get(backendUrl("/api/patients/appointments"));
    return response.data;
  },
};

export const doctorService = {
  getAppointments: async () => {
    const response = await apiClient.get(backendUrl("/api/appointments"));
    return response.data;
  },
};

export { apiClient };

export const apiGet = async (url, params = {}) => {
  if (!url || typeof url !== "string") {
    throw new Error("apiGet called with invalid URL");
  }

  if (params === null || params === undefined) {
    params = {};
  } else if (typeof params !== "object") {
    params = {};
  }

  const response = await apiClient.get(backendUrl(url), { params });
  return response.data;
};

const normalizeConfig = (tokenOrConfig, extraConfig) => {
  const baseConfig =
    tokenOrConfig && typeof tokenOrConfig === "object" ? tokenOrConfig : {};

  const merged = extraConfig && typeof extraConfig === "object"
    ? { ...baseConfig, ...extraConfig }
    : { ...baseConfig };

  const mergedHeaders = {
    ...(baseConfig.headers || {}),
    ...(extraConfig?.headers || {}),
  };

  if (Object.keys(mergedHeaders).length) {
    merged.headers = mergedHeaders;
  }

  if (typeof tokenOrConfig === "string" && tokenOrConfig) {
    merged.headers = merged.headers || {};
    merged.headers.Authorization = `Bearer ${tokenOrConfig}`;
  }

  return merged;
};

// Supports:
// - apiPost(url, data)
// - apiPost(url, data, configObject)
// - apiPost(url, data, tokenString)
// - apiPost(url, data, tokenString, isForm)
export const apiPost = async (url, data, tokenOrConfig = {}, isForm = false) => {
  const config = normalizeConfig(tokenOrConfig);
  const response = await apiClient.post(backendUrl(url), data, config);
  return response.data;
};

export const apiPut = async (url, data, tokenOrConfig = {}, isForm = false) => {
  const config = normalizeConfig(tokenOrConfig);
  const response = await apiClient.put(backendUrl(url), data, config);
  return response.data;
};

export const apiDelete = async (url, tokenOrConfig = {}) => {
  const config = normalizeConfig(tokenOrConfig);
  const response = await apiClient.delete(backendUrl(url), config);
  return response.data;
};
