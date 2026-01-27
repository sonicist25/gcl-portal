// src/utils/authApi.js

const API_BASE = "https://gateway-cl.com/api";
const API_KEY  = "gateway-fms";

let isRefreshing = false;
let refreshPromise = null;

/**
 * Simpan token ke localStorage
 */
function saveTokens(data) {
  if (!data) return;
  if (data.access_token) {
    localStorage.setItem("gcl_access_token", data.access_token);
  }
  if (data.refresh_token) {
    localStorage.setItem("gcl_refresh_token", data.refresh_token);
  }
  if (data.expires_at) {
    localStorage.setItem("gcl_token_expires", data.expires_at);
  }
}

/**
 * Panggil endpoint refresh token SATU kali
 */
async function refreshAccessToken() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise; // reuse request yang sudah jalan
  }

  const refreshToken = localStorage.getItem("gcl_refresh_token");
  if (!refreshToken) {
    throw new Error("Refresh token tidak ada, silakan login ulang.");
  }

  isRefreshing   = true;
  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/customer_login/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error("Gagal refresh token");
    }

    const json = await res.json();
    if (!json.status) {
      throw new Error(json.message || json.error || "Refresh token gagal");
    }

    saveTokens(json.data);
    return json.data.access_token;
  })();

  try {
    const newToken = await refreshPromise;
    return newToken;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * Wrapper fetch dengan auto-refresh token
 */
export async function apiFetch(url, options = {}) {
  const token  = localStorage.getItem("gcl_access_token");
  const headers = {
    "X-API-KEY": API_KEY,
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(url, { ...options, headers });

  // kalau token sudah expired → server biasanya balas 401
  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken();

      const retryHeaders = {
        "X-API-KEY": API_KEY,
        ...(options.headers || {}),
        Authorization: `Bearer ${newToken}`,
      };

      // Ulangi request sekali lagi pakai token baru
      res = await fetch(url, { ...options, headers: retryHeaders });
    } catch (err) {
      // refresh gagal → paksa logout
      localStorage.removeItem("gcl_access_token");
      localStorage.removeItem("gcl_refresh_token");
      localStorage.removeItem("gcl_token_expires");
      localStorage.removeItem("gcl_user");

      window.location.href = "/login";
      throw err;
    }
  }

  const json = await res.json();
  return json;
}
