import axios from "axios";

// ✅ API Base URL
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ✅ Attach token automatically
apiClient.interceptors.request.use(
  (config) => {
    // Let Axios infer headers for FormData so it can set the multipart boundary.
    if (typeof FormData !== "undefined" && config?.data instanceof FormData) {
      try {
        if (config.headers) {
          delete config.headers["Content-Type"];
          delete config.headers["content-type"];
        }
      } catch (err) {
        // ignore
      }
    } else {
      config.headers = config.headers || {};
      if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Global response handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.customMessage ||
      error.message ||
      "API Error";

    console.error("API Error:", message);

    return Promise.reject({
      ...error,
      message,
    });
  }
);

export default apiClient;
