// src/utils/authApi.js

const API_BASE = "https://gateway-cl.com/api";
const API_KEY  = "gateway-fms";

let isRefreshing = false;
let refreshPromise = null;

/** =========================
 *  Token helpers
 *  ========================= */
function saveTokens(data) {
  if (!data) return;

  if (data.access_token) localStorage.setItem("gcl_access_token", data.access_token);
  if (data.refresh_token) localStorage.setItem("gcl_refresh_token", data.refresh_token);

  // opsional (kalau backend kirim expires_at)
  if (data.expires_at) localStorage.setItem("gcl_token_expires", data.expires_at);
}

function clearAuthStorage() {
  localStorage.removeItem("gcl_access_token");
  localStorage.removeItem("gcl_refresh_token");
  localStorage.removeItem("gcl_token_expires");
  localStorage.removeItem("gcl_user");
}

function getAccessToken() {
  return localStorage.getItem("gcl_access_token");
}

function getRefreshToken() {
  return localStorage.getItem("gcl_refresh_token");
}

/** =========================
 *  Detect expired token
 *  ========================= */
function isTokenExpiredResponse(res, json) {
  if (res.status === 401) return true;

  const msg = (json?.message || json?.error || "").toString().toLowerCase();
  // sesuaikan jika backend kamu pakai string lain
  return (
    msg.includes("expired token") ||
    msg.includes("token expired") ||
    msg.includes("jwt expired") ||
    msg.includes("token has expired")
  );
}

/** =========================
 *  Refresh token (single flight)
 *  ========================= */
async function refreshAccessToken() {
  if (isRefreshing && refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");

  isRefreshing = true;

  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/customer_login/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || json?.status === false) {
      throw new Error(json?.message || json?.error || "REFRESH_FAILED");
    }

    // asumsi struktur: { status:true, data:{access_token, refresh_token?, expires_at?} }
    saveTokens(json.data);

    if (!json?.data?.access_token) throw new Error("REFRESH_NO_ACCESS_TOKEN");

    return json.data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/** =========================
 *  Logout handler
 *  ========================= */
function forceLoginRedirect() {
  clearAuthStorage();
  // kalau pakai react-router, lebih ideal navigate, tapi ini versi global:
  window.location.href = "/login";
}

/** =========================
 *  Wrapper fetch with auto refresh
 *  =========================
 *  Notes:
 *  - Retry hanya aman jika body bisa dikirim ulang.
 *  - Untuk FormData biasanya aman, tapi untuk stream/Request body tertentu bisa tidak.
 */
export async function apiFetch(endpointOrUrl, options = {}) {
  const url = endpointOrUrl.startsWith("http")
    ? endpointOrUrl
    : `${API_BASE}${endpointOrUrl.startsWith("/") ? "" : "/"}${endpointOrUrl}`;

  const token = getAccessToken();

  const headers = {
    Accept: "application/json",
    "X-API-KEY": API_KEY,
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // request pertama
  let res = await fetch(url, { ...options, headers });

  // parse JSON kalau ada
  let json = null;
  try { json = await res.clone().json(); } catch (_) {}

  // kalau tidak expired → return normal
  if (!isTokenExpiredResponse(res, json)) {
    // kalau server return non-json, fallback text
    if (json !== null) return json;
    const text = await res.text().catch(() => "");
    return { status: res.ok, message: text, http_status: res.status };
  }

  // expired → coba refresh → retry sekali
  try {
    const newToken = await refreshAccessToken();

    const retryHeaders = {
      Accept: "application/json",
      "X-API-KEY": API_KEY,
      ...(options.headers || {}),
      Authorization: `Bearer ${newToken}`,
    };

    res = await fetch(url, { ...options, headers: retryHeaders });

    // parse retry json
    const retryJson = await res.json().catch(() => null);

    // kalau masih 401/expired setelah refresh → paksa login
    if (retryJson && isTokenExpiredResponse(res, retryJson)) {
      forceLoginRedirect();
      throw new Error("SESSION_EXPIRED");
    }

    if (retryJson !== null) return retryJson;

    const text = await res.text().catch(() => "");
    return { status: res.ok, message: text, http_status: res.status };
  } catch (err) {
    // refresh gagal → paksa logout
    forceLoginRedirect();
    throw err;
  }
}
