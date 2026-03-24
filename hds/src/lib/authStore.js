export const AUTH_CHANGE_EVENT = "auth:change";

let cachedToken = null;
let cachedUserRaw = null;
let cachedSnapshot = null;

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const readStoredUser = () => {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  if (token === cachedToken && storedUser === cachedUserRaw) {
    return cachedSnapshot;
  }

  cachedToken = token;
  cachedUserRaw = storedUser;

  if (!token || !storedUser) {
    cachedSnapshot = null;
    return null;
  }

  const parsed = safeParseJson(storedUser);
  if (!parsed) {
    cachedSnapshot = null;
    return null;
  }

  if (parsed && !parsed.email && parsed.username) {
    cachedSnapshot = { ...parsed, email: parsed.username };
    return cachedSnapshot;
  }

  cachedSnapshot = parsed;
  return cachedSnapshot;
};

export const subscribeToAuthChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.key === "token" || event.key === "user") callback();
  };
  const onCustom = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_CHANGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_CHANGE_EVENT, onCustom);
  };
};

export const emitAuthChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};
