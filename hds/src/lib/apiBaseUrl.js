export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const withApiBaseUrl = (pathOrUrl = "") => {
  const value = String(pathOrUrl || "");
  if (!value) return API_BASE_URL;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (!API_BASE_URL) {
    return value.startsWith("/") ? value : `/${value}`;
  }

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
};

