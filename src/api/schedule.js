const API_KEY = import.meta.env.VITE_API_KEY || "gateway-fms";

/**
 * Karena VITE_API_BASE_URL Anda biasanya:
 * https://gateway-cl.com/api/crm
 *
 * Sedangkan schedule endpoint ada di:
 * https://gateway-cl.com/api/schedule
 * https://gateway-cl.com/api/schedule_import
 *
 * Jadi kita strip "/crm".
 */
function getRootApiBase() {
  const crmBase = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return crmBase.replace(/\/crm$/i, "");
}

function buildUrl(path, params = {}) {
  const base = getRootApiBase();
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);

  url.searchParams.set("X-API-KEY", API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const text = await res.text();

  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: true, message: text || "Invalid JSON response" };
  }

  if (!res.ok) {
    throw new Error(json?.message || `Request failed with HTTP ${res.status}`);
  }

  return json;
}

export async function getExportSchedule({ city = "", etd = "" } = {}) {
  const url = buildUrl("/schedule", {
    city,
    etd,
  });

  return fetchJson(url);
}

export async function getImportSchedule() {
  const url = buildUrl("/schedule_import");
  return fetchJson(url);
}