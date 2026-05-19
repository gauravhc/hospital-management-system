import { API_BASE_URL, withApiBaseUrl } from "@/lib/apiBaseUrl";

export { API_BASE_URL };

export default function backendUrl(pathOrUrl = "") {
  return withApiBaseUrl(pathOrUrl);
}
