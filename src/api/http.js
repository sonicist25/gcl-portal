let refreshPromise = null;

function buildUrl(base, path, params) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${b}${p}`);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }

  return url.toString();
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const base = import.meta.env.VITE_API_BASE_URL; // https://gateway-cl.com/api/crm
      const apiKey = import.meta.env.VITE_API_KEY;    // gateway-fms
      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) throw new Error("No refresh token");

      const res = await fetch(`${base}/login/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status === false) {
        throw new Error(json?.message || "Refresh failed");
      }

      localStorage.setItem("access_token", json.access_token);
      localStorage.setItem("refresh_token", json.refresh_token); // rotate
      return json.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function http(path, { method = "GET", params, body } = {}) {
  const base = import.meta.env.VITE_API_BASE_URL;
  const apiKey = import.meta.env.VITE_API_KEY;

  async function doFetch() {
    const token = localStorage.getItem("access_token") || "";
    const url = buildUrl(base, path, params);

    const headers = {
      Accept: "application/json",
      "X-API-KEY": apiKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // set content-type hanya kalau ada body
      // ⬇️ hanya set Content-Type kalau body bukan FormData
    if (body !== undefined && body !== null && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }



    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined && body !== null
          ? body instanceof FormData
            ? body // biarkan browser set boundary multipart
            : JSON.stringify(body)
          : undefined,
    });

    // jangan bikin promise nyangkut kalau bukan json
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }

    return { res, json };
  }

  let { res, json } = await doFetch();

  if (res.status === 401) {
    try {
      await refreshAccessToken();
      ({ res, json } = await doFetch());
    } catch (e) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      throw e;
    }
  }

  return json;
}
