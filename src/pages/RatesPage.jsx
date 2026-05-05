import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  Boxes,
  CalendarDays,
  ChevronDown,
  DollarSign,
  Eye,
  Filter,
  Package,
  RefreshCw,
  Route,
  Search,
  Ship,
  Plane,
  X,
} from "lucide-react";

import GclLayout from "../layouts/GclLayout";
import QuoteRequestModal from "./QuoteRequestModal"; // Pastikan path ini sesuai

// ==============================================================================
// 1. UTILS & BUSINESS LOGIC
// ==============================================================================

function clsx(...a) {
  return a.filter(Boolean).join(" ");
}

function clean(v, fallback = "-") {
  const s = String(v ?? "").trim();
  if (!s || s.toLowerCase() === "null") return fallback;
  return s;
}

// Aturan 1, 2, 3, 4 untuk LCL
function calcLcl(v) {
  if (v === null || v === undefined || v === "") return null;
  let n = Number(v);
  if (isNaN(n)) return null;

  if (n < 0) return "FREE"; // Aturan 3: Lcl minus -> FREE
  if (n === 0) return 2;    // Aturan 2: Lcl 0 -> 2 dollars
  return n * 1.2;           // Aturan 1: Naik 20%
}

// Aturan 1, 4 untuk FCL
function calcFcl(v) {
  if (v === null || v === undefined || v === "") return null;
  let n = Number(v);
  if (isNaN(n) || n <= 0) return null; // Aturan 4: Jika 0 tampilkan "-" (dijadikan null agar dirender -)
  return n * 1.2;                      // Aturan 1: Naik 20%
}

// Aturan 1, 4 untuk Air
function calcAir(v) {
  if (v === null || v === undefined || v === "") return null;
  let n = Number(v);
  if (isNaN(n) || n <= 0) return null;
  return n * 1.2;
}

// Format Uang LCL/FCL (USD) atau Air (IDR)
function money(v, isIDR = false) {
  if (v === "FREE") return "FREE";
  if (v === null || v === undefined || v === "") return "-";
  
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "-"; 

  if (isIDR) {
    return `IDR ${n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(v) {
  const s = clean(v, "");
  if (!s || s === "-") return "-";
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function daysToValidity(v) {
  const s = clean(v, "");
  if (!s || s === "-") return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(`${s}T00:00:00`); d.setHours(0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function validityTone(v) {
  const diff = daysToValidity(v);
  if (diff === null) return "bg-white/10 text-slate-300 border-white/10";
  if (diff < 0) return "bg-rose-500/15 text-rose-300 border-rose-400/30";
  if (diff <= 7) return "bg-amber-500/15 text-amber-300 border-amber-400/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
}

function cargoTone(type) {
  const t = clean(type, "").toUpperCase();
  if (t === "DG" || t === "DANGEROUS GOODS") return "bg-rose-500/15 text-rose-300 border-rose-400/30";
  if (t === "REEFER") return "bg-cyan-500/15 text-cyan-300 border-cyan-400/30";
  if (t === "BREAKBULK") return "bg-amber-500/15 text-amber-300 border-amber-400/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
}

const AIRLINE_LOGOS = {
  CI: "/assets/Airlines/ci.png",
  TK: "/assets/Airlines/tk.png",
  JT: "/assets/Airlines/jt.png",
  MH: "/assets/Airlines/mh.png",
  SV: "/assets/Airlines/sv.png",
  GA: "/assets/Airlines/ga.png",
};

// ==============================================================================
// 2. COMPONENTS
// ==============================================================================

function SummaryCard({ icon: Icon, label, value, hint, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    violet: "border-violet-300/20 bg-violet-300/10 text-violet-200",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-200",
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{value}</h3>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div className={clsx("rounded-2xl border p-3", tones[tone] || tones.cyan)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 pr-10 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Search</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Route, origin, destination, liner..."
          className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 pl-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
        />
      </div>
    </label>
  );
}

function LclPreview({ rate }) {
  const count = Number(rate.lcl_count || 0);
  const price = rate.min_lcl_price; // Sudah di markup di level parser

  if (!count || price === null || price === undefined) {
    return <span className="text-slate-500">-</span>;
  }

  return (
    <div className="leading-tight">
      {count > 1 && <div className="text-[10px] uppercase tracking-wider text-slate-500">mulai dari</div>}
      <div className={clsx("font-bold", price === "FREE" ? "text-amber-300" : "text-cyan-300")}>
        {price === "FREE" ? "FREE" : money(price)}
        {price !== "FREE" && <span className="ml-1 text-amber-300">*</span>}
      </div>
      {rate.min_lcl_type_name && <div className="mt-1 text-[11px] text-slate-500">{rate.min_lcl_type_name}</div>}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold transition",
        active
          ? "bg-cyan-300 text-slate-950"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function InfoBox({ title, content, tone }) {
  const tones = {
    emerald: "text-emerald-300 border-emerald-300/20 bg-emerald-300/5",
    rose: "text-rose-300 border-rose-300/20 bg-rose-300/5",
    amber: "text-amber-300 border-amber-300/20 bg-amber-300/5",
    cyan: "text-cyan-300 border-cyan-300/20 bg-cyan-300/5",
  };
  return (
    <div className={clsx("rounded-3xl border p-5", tones[tone] || tones.cyan)}>
      <p className="text-[11px] font-black uppercase tracking-[0.22em]">{title}</p>
      <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-100">{clean(content)}</div>
    </div>
  );
}

// ==============================================================================
// 3. SEA RATES DETAIL MODAL
// ==============================================================================

function PricingDetailModal({ open, onClose, loading, error, detail }) {
  const header = detail?.header || {};
  const lclRaw = Array.isArray(detail?.lcl) ? detail.lcl : [];
  const dataRaw = detail?.data || {};

  // Terapkan markup LCL dan FCL di komponen detail
  const validLcl = lclRaw.map(x => ({ ...x, price: calcLcl(x.price) })).filter((x) => x?.price !== null);
  
  const componentGroups = Object.entries(dataRaw).map(([groupName, rows]) => {
    return [
      groupName,
      (Array.isArray(rows) ? rows : []).map(item => ({
        ...item,
        "20": calcFcl(item["20"]),
        "40": calcFcl(item["40"]),
        "40hc": calcFcl(item["40hc"])
      }))
    ];
  });

  const totals = useMemo(() => {
    const t = { "20": null, "40": null, "40hc": null };
    componentGroups.forEach(([, rows]) => {
      rows.forEach((item) => {
        ["20", "40", "40hc"].forEach((key) => {
          if (item[key] !== null) t[key] = (t[key] || 0) + item[key];
        });
      });
    });
    return t;
  }, [componentGroups]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
        
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.04] px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <Ship className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wide text-white">{clean(header.liner_name, "Pricing Detail")}</h2>
              <p className="mt-1 text-sm text-slate-400">Freight rate ID #{header.id || "-"}</p>
            </div>
            <span className={clsx("rounded-full border px-3 py-1 text-xs font-bold", cargoTone(header.cargo_type))}>
              {clean(header.cargo_type, "GENCO")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[22px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
            style={{ lineHeight: 1, paddingBottom: "2px" }}
          >
            &#x2715;
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="grid gap-4">
              <div className="h-20 animate-pulse rounded-3xl bg-white/10" />
              <div className="h-80 animate-pulse rounded-3xl bg-white/10" />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-200">{error}</div>
          ) : (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Validity</p>
                  <p className="mt-2 font-semibold text-white">{formatDate(header.validity_period)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Free Time</p>
                  <p className="mt-2 font-semibold text-white">{clean(header.free_time)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Transit / Remarks</p>
                  <p className="mt-2 font-semibold text-white">{clean(header.inland_moda)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Created At</p>
                  <p className="mt-2 font-semibold text-white">{clean(header.created_at)}</p>
                </div>
              </div>

              <div className="mb-6 overflow-x-auto rounded-3xl border border-white/10">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-4 text-left">Component</th>
                      <th className="px-4 py-4 text-right">20'</th>
                      <th className="px-4 py-4 text-right">40'</th>
                      <th className="px-4 py-4 text-right">40'HC</th>
                      {validLcl.map((item) => (
                        <th key={item.id} className="px-4 py-4 text-right text-cyan-300">
                          LCL
                          <div className="text-[10px] normal-case tracking-normal text-slate-500">{item.type_name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {componentGroups.length === 0 ? (
                      <tr><td colSpan={4 + validLcl.length} className="px-4 py-10 text-center text-slate-400">No pricing component found.</td></tr>
                    ) : (
                      componentGroups.map(([groupName, rows]) => (
                        <span key={groupName} className="contents">
                          <tr className="border-t border-white/10 bg-white/[0.04]">
                            <td colSpan={4 + validLcl.length} className="px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                              {groupName}
                            </td>
                          </tr>
                          {rows.map((item, idx) => (
                            <tr key={`${groupName}-${idx}`} className="border-t border-white/10 bg-white/[0.02] hover:bg-white/[0.05]">
                              <td className="px-4 py-4 font-medium text-white">{clean(item.name)}</td>
                              <td className="px-4 py-4 text-right font-mono text-slate-200">{money(item["20"])}</td>
                              <td className="px-4 py-4 text-right font-mono text-slate-200">{money(item["40"])}</td>
                              <td className="px-4 py-4 text-right font-mono text-slate-200">{money(item["40hc"])}</td>
                              {validLcl.map((x) => <td key={x.id} className="px-4 py-4 text-right text-slate-500">-</td>)}
                            </tr>
                          ))}
                        </span>
                      ))
                    )}
                    <tr className="border-t-2 border-cyan-300/30 bg-cyan-300/10">
                      <td className="px-4 py-4 text-base font-black text-white">TOTAL ALL IN</td>
                      <td className="px-4 py-4 text-right text-base font-black text-emerald-300">{money(totals["20"])}</td>
                      <td className="px-4 py-4 text-right text-base font-black text-emerald-300">{money(totals["40"])}</td>
                      <td className="px-4 py-4 text-right text-base font-black text-emerald-300">{money(totals["40hc"])}</td>
                      {validLcl.map((x) => <td key={x.id} className="px-4 py-4 text-right text-base font-black text-cyan-300">{money(x.price)}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox title="Include of Rate" tone="emerald" content={header.include_rate} />
                <InfoBox title="Exclude of Rate" tone="rose" content={header.exclude_rate} />
                <InfoBox title="Remarks" tone="amber" content={header.inland_moda} />
                <InfoBox title="Free Time D&D" tone="cyan" content={header.free_time} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 4. MAIN PAGE
// ==============================================================================

export default function PricingPage() {
  const [tab, setTab] = useState("sea"); // "sea" | "air"
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [seaGroups, setSeaGroups] = useState([]);
  const [airGroups, setAirGroups] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [sortBy, setSortBy] = useState("route_asc");

  // Modals
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteData, setQuoteData] = useState(null);

  // Fetch Logic
  async function loadPricing() {
    try {
      setLoading(true);
      setErr("");

      // 1. Fetch Sea Rates
      const seaRes = await fetch("https://gateway-cl.com/api/crm/pricing?X-API-KEY=gateway-fms").then(r => r.json());
      const parsedSea = [];
      Object.entries(seaRes?.data || {}).forEach(([route, rates]) => {
        parsedSea.push({
          route,
          rates: rates.map((r) => ({
            ...r,
            min_lcl_price: calcLcl(r.min_lcl_price),
            prices: {
              "20": calcFcl(r?.prices?.["20"]),
              "40": calcFcl(r?.prices?.["40"]),
              "40HC": calcFcl(r?.prices?.["40HC"] || r?.prices?.["40hc"]),
            },
          })),
        });
      });
      setSeaGroups(parsedSea.sort((a, b) => a.route.localeCompare(b.route)));

      // 2. Fetch Air Rates
      const airRes = await fetch("https://gateway-cl.com/api/feeder_rate?X-API-KEY=gateway-fms").then(r => r.json());
      const airMap = {};
      (airRes?.data?.air || []).forEach((r) => {
        const route = `${r.origin_code} (${r.origin}) ➝ ${r.destination_code} (${r.destination})`;
        if (!airMap[route]) airMap[route] = [];
        airMap[route].push({
          ...r,
          minimum: calcAir(r.minimum),
          normal: calcAir(r.normal),
          rate_45: calcAir(r.rate_45),
          rate_100: calcAir(r.rate_100),
          rate_300: calcAir(r.rate_300),
          rate_500: calcAir(r.rate_500),
          rate_1000: calcAir(r.rate_1000),
        });
      });
      setAirGroups(Object.entries(airMap).map(([route, rates]) => ({ route, rates })).sort((a, b) => a.route.localeCompare(b.route)));

    } catch (e) {
      setErr(e?.message || "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPricing();
  }, []);

  // Open Sea Detail Modal
// Open Sea Detail Modal
  async function openDetail(rate, routeName) {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError("");
      setDetail(null);

      const formData = new URLSearchParams();
      formData.append("rate_id", rate.id);

      console.log("1. Mengirim POST request untuk rate_id:", rate.id);

      const response = await fetch("https://gateway-cl.com/api/crm/pricing/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-API-KEY" : "gateway-fms",
        },
        body: formData,
      });

      console.log("2. HTTP Status:", response.status);

      // Ambil respons sebagai teks mentah untuk melihat apakah ada pesan error dari PHP
      const rawText = await response.text();
      console.log("3. Raw Response dari Server:", rawText);

      // Coba parse ke JSON
      let json;
      try {
        json = JSON.parse(rawText);
      } catch (err) {
        throw new Error("Respons server bukan JSON valid. Cek tab Console untuk melihat respons asli dari PHP.");
      }

      if (json?.status !== "success") {
        throw new Error(json?.message || "Failed to load detail (API status not success)");
      }

      // Jika berhasil
      setDetail({ ...json, routeName });
    } catch (e) {
      console.error("4. Error tertangkap:", e);
      setDetailError(e?.message || "Terjadi kesalahan saat memuat detail");
    } finally {
      setDetailLoading(false);
    }
  }

  // Open Air Quote Modal
  function handleOpenQuote(rate) {
    setQuoteData({ ...rate, serviceType: "Airfreight" });
    setQuoteModalOpen(true);
  }

  // Memoized Filter Options & Lists
  const activeGroups = tab === "sea" ? seaGroups : airGroups;

  const cargoOptions = useMemo(() => {
    const s = new Set();
    activeGroups.forEach((g) => g.rates.forEach((r) => {
      const type = tab === "sea" ? r.cargo_type : r.commodity;
      if (type) s.add(type);
    }));
    return Array.from(s).sort();
  }, [activeGroups, tab]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = activeGroups.map((group) => {
      const rates = group.rates.filter((rate) => {
        const type = tab === "sea" ? rate.cargo_type : rate.commodity;
        const liner = tab === "sea" ? rate.liner_name : rate.airline;
        const haystack = [group.route, liner, type].join(" ").toLowerCase();

        if (q && !haystack.includes(q)) return false;
        if (cargoType && type !== cargoType) return false;
        return true;
      });
      return { ...group, rates };
    }).filter((g) => g.rates.length > 0);

    rows = rows.sort((a, b) => {
      if (sortBy === "route_asc") return a.route.localeCompare(b.route);
      if (sortBy === "route_desc") return b.route.localeCompare(a.route);
      if (sortBy === "liners_desc") return b.rates.length - a.rates.length;
      return 0;
    });

    return rows;
  }, [activeGroups, search, cargoType, sortBy, tab]);

  const summary = useMemo(() => {
    const visibleRates = filteredGroups.flatMap((g) => g.rates);
    
    if (tab === "sea") {
      const liners = new Set(visibleRates.map((r) => r.liner_name).filter(Boolean));
      const withLcl = visibleRates.filter((r) => Number(r.lcl_count || 0) > 0).length;
      return { routes: filteredGroups.length, totalRates: visibleRates.length, liners: liners.size, extraLabel: "LCL Options", extraValue: withLcl };
    } else {
      const airlines = new Set(visibleRates.map((r) => r.airline).filter(Boolean));
      return { routes: filteredGroups.length, totalRates: visibleRates.length, liners: airlines.size, extraLabel: "Airlines", extraValue: airlines.size };
    }
  }, [filteredGroups, tab]);

  return (
    <GclLayout>
      <div className="h-full overflow-y-auto bg-transparent p-4 text-slate-100 md:p-6">
        <div className="mx-auto w-full max-w-[1600px]">
          
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-md md:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative z-10">
              
              {/* HEADER */}
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-200">
                    <Boxes className="h-4 w-4" />
                    Gateway Pricing Database
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Rates &amp; Tariff</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Browse public all-in rates for LCL, FCL, and Airfreight (Export). Rates displayed include +20% markup from base.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadPricing}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </button>
              </div>

              {/* TABS */}
              <div className="mt-6 flex flex-wrap gap-3">
                <TabButton active={tab === "sea"} onClick={() => setTab("sea")} icon={Ship}>
                  Sea Rates (FCL/LCL)
                </TabButton>
                <TabButton active={tab === "air"} onClick={() => setTab("air")} icon={Plane}>
                  Air Rates
                </TabButton>
              </div>

              {/* FILTERS */}
              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <Filter className="h-4 w-4 text-cyan-200" /> Filters
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <SearchInput value={search} onChange={setSearch} />
                  <SelectField label="Cargo / Commodity" value={cargoType} onChange={setCargoType}>
                    <option value="">All Type</option>
                    {cargoOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </SelectField>
                  <SelectField label="Sort By" value={sortBy} onChange={setSortBy}>
                    <option value="route_asc">Route A-Z</option>
                    <option value="route_desc">Route Z-A</option>
                    <option value="liners_desc">Most Liners / Airlines</option>
                  </SelectField>
                  <button
                    onClick={() => { setSearch(""); setCargoType(""); setSortBy("route_asc"); }}
                    className="mt-auto h-11 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>

              {err && <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{err}</div>}

              {/* SUMMARY CARDS */}
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <SummaryCard icon={Route} label="Routes" value={summary.routes} hint="Visible route groups" tone="cyan" />
                <SummaryCard icon={tab === "sea" ? Ship : Plane} label="Rates" value={summary.totalRates} hint="Visible offers" tone="emerald" />
                <SummaryCard icon={Anchor} label={tab === "sea" ? "Liners" : "Airlines"} value={summary.liners} hint="Unique providers" tone="violet" />
                <SummaryCard icon={Package} label={summary.extraLabel} value={summary.extraValue} hint="Available" tone="amber" />
              </div>

              {/* TABLE AREA */}
              <div className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Freight Rate List</h2>
                    <p className="text-sm text-slate-400">Showing {summary.totalRates} rates in {summary.routes} routes.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-slate-300">
                    <CalendarDays className="h-4 w-4 text-cyan-200" />
                    Validity based on provider quotation
                  </div>
                </div>

                {loading ? (
                  <div className="grid gap-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-[26px] bg-white/10" />)}
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-white/15 p-10 text-center text-sm text-slate-400">
                    No pricing data found.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredGroups.map((group) => (
                      <div key={group.route} className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/30">
                        <div className="flex flex-col gap-2 border-b border-white/10 bg-white/[0.06] px-5 py-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                              <Route className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black uppercase tracking-wide text-white">{group.route}</h3>
                              <p className="text-xs text-slate-400">{group.rates.length} options</p>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          {/* TAB: SEA RATES */}
                          {tab === "sea" && (
                            <table className="w-full min-w-[1050px] border-collapse text-sm">
                              <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                                <tr>
                                  <th className="px-4 py-4 text-left">Liner</th>
                                  <th className="px-4 py-4 text-center">Type</th>
                                  <th className="px-4 py-4 text-center">Validity</th>
                                  <th className="px-4 py-4 text-right">20' All-In</th>
                                  <th className="px-4 py-4 text-right">40' All-In</th>
                                  <th className="px-4 py-4 text-right">40'HC All-In</th>
                                  <th className="px-4 py-4 text-right">LCL / CBM</th>
                                  <th className="px-4 py-4 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.rates.map((rate) => (
                                  <tr key={rate.id} className="border-t border-white/10 bg-white/[0.02] hover:bg-white/[0.05]">
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-200">
                                          <Ship className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <p className="font-bold text-white">{rate.liner_name}</p>
                                          <p className="text-xs text-slate-500">ID #{rate.id}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className={clsx("rounded-full border px-3 py-1 text-xs font-bold", cargoTone(rate.cargo_type))}>
                                        {rate.cargo_type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className={clsx("rounded-full border px-3 py-1 text-xs", validityTone(rate.validity_period))}>
                                        {formatDate(rate.validity_period)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-300">{money(rate.prices["20"])}</td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-300">{money(rate.prices["40"])}</td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-300">{money(rate.prices["40HC"])}</td>
                                    <td className="px-4 py-4 text-right"><LclPreview rate={rate} /></td>
                                    <td className="px-4 py-4 text-right">
                                      <button
                                        onClick={() => openDetail(rate, group.route)}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/20"
                                      >
                                        <Eye className="h-4 w-4" /> Detail
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {/* TAB: AIR RATES */}
                          {tab === "air" && (
                            <table className="w-full min-w-[1250px] border-collapse text-sm">
                              <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                                <tr>
                                  <th className="px-4 py-4 text-left">Airline</th>
                                  <th className="px-4 py-4 text-center">SHC</th>
                                  <th className="px-4 py-4 text-right">Min</th>
                                  <th className="px-4 py-4 text-right">N</th>
                                  <th className="px-4 py-4 text-right">+45</th>
                                  <th className="px-4 py-4 text-right">+100</th>
                                  <th className="px-4 py-4 text-right">+300</th>
                                  <th className="px-4 py-4 text-right">+500</th>
                                  <th className="px-4 py-4 text-right">+1000</th>
                                  <th className="px-4 py-4 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.rates.map((rate, idx) => (
                                  <tr key={`air-${idx}`} className="border-t border-white/10 bg-white/[0.02] hover:bg-white/[0.05]">
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-3">
                                        {AIRLINE_LOGOS[rate.airline_code] ? (
                                          <img src={AIRLINE_LOGOS[rate.airline_code]} alt={rate.airline_code} className="h-8 w-auto rounded object-contain bg-white p-1" />
                                        ) : (
                                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-200">
                                            <Plane className="h-4 w-4" />
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-bold text-white">{rate.airline}</p>
                                          <p className="text-[10px] uppercase text-amber-300">Valid: {formatDate(rate.valid)}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className={clsx("rounded-full border px-3 py-1 text-xs font-bold", cargoTone(rate.shc))}>
                                        {rate.shc}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono font-semibold text-slate-300">{money(rate.minimum, true)}</td>
                                    <td className="px-4 py-4 text-right font-mono font-semibold text-emerald-300">{money(rate.normal, true)}</td>
                                    <td className="px-4 py-4 text-right font-mono font-semibold text-emerald-300">{money(rate.rate_45, true)}</td>
                                    <td className="px-4 py-4 text-right font-mono font-semibold text-emerald-300">{money(rate.rate_100, true)}</td>
                                    <td className="px-4 py-4 text-right font-mono font-semibold text-emerald-300">{money(rate.rate_300, true)}</td>
                                    <td className="px-4 py-4 text-right font-mono font-semibold text-emerald-300">{money(rate.rate_500, true)}</td>
                                    <td className="px-4 py-4 text-right font-mono font-semibold text-emerald-300">{money(rate.rate_1000, true)}</td>
                                    <td className="px-4 py-4 text-right">
                                      <button
                                        onClick={() => handleOpenQuote(rate)}
                                        className="inline-flex h-10 items-center justify-center rounded-2xl bg-cyan-400 px-4 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
                                      >
                                        Quote
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PricingDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
        error={detailError}
        detail={detail}
      />

      {/* Modal Eksternal untuk Air Quotes */}
      <QuoteRequestModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        rateData={quoteData}
      />
    </GclLayout>
  );
}