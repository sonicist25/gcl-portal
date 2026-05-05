import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GclLayout from "../layouts/GclLayout";
import { apiFetch } from "../utils/authApi";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import "../styles/dashboard.css"; 

const PIE_COLORS = [
  "#ffd54f",
  "#4fc3f7",
  "#ff8a65",
  "#81c784",
  "#ba68c8",
  "#f06292",
  "#ffb74d",
];

// --- FUNGSI FORMATTER ---
function formatRupiah(num) {
  if (num == null || isNaN(num)) return "-";
  const n = Number(num);
  return n.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

function formatShortIDR(value) {
  const n = Number(value);
  if (isNaN(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "b";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

function formatDateYmd(ymd) {
  if (!ymd || ymd.length !== 8) return "-";
  const y = ymd.substring(0, 4);
  const m = ymd.substring(4, 6);
  const d = ymd.substring(6, 8);
  return `${d}-${m}-${y}`;
}

function getTrackingStatusMeta(rawStatus) {
  const s = (rawStatus || "").trim();
  if (!s) return { label: "Not Tracked", className: "gcl-pill-status gcl-pill-status-none" };
  const u = s.toUpperCase();
  if (u === "ACTIVE") return { label: "Active", className: "gcl-pill-status gcl-pill-status-active" };
  if (u === "DELAYED" || u === "DELAY") return { label: "Delayed", className: "gcl-pill-status gcl-pill-status-delayed" };
  if (u === "PERFECT") return { label: "Perfect", className: "gcl-pill-status gcl-pill-status-perfect" };
  if (u === "PENDING") return { label: "Pending", className: "gcl-pill-status gcl-pill-status-pending" };
  if (u === "COMPLETED") return { label: "Completed", className: "gcl-pill-status gcl-pill-status-completed" };
  if (u === "EXPIRED") return { label: "Expired", className: "gcl-pill-status gcl-pill-status-expired" };
  if (u === "INVALID") return { label: "Invalid", className: "gcl-pill-status gcl-pill-status-invalid" };
  if (u === "DATA NOT FOUND") return { label: "Data Not Found", className: "gcl-pill-status gcl-pill-status-data-not-found" };
  if (u === "ACTION REQUIRED") return { label: "Action Required", className: "gcl-pill-status gcl-pill-status-action-required" };
  if (u === "PROBABLE DELAY") return { label: "Probable Delay", className: "gcl-pill-status gcl-pill-status-probable-delay" };
  if (u === "YET TO START") return { label: "Yet to Start", className: "gcl-pill-status gcl-pill-status-yet" };
  return { label: s, className: "gcl-pill-status gcl-pill-status-none" };
}

function getCustomerTierMeta(totalShipments) {
  const now = new Date();
  const month = now.getMonth() + 1; 

  if (!totalShipments || month <= 0) {
    return { label: "Bronze", avgPerMonth: 0, cssClass: "gcl-tier-bronze" };
  }

  const avg = totalShipments / month; 
  let label = "Bronze";
  let cssClass = "gcl-tier-bronze";

  if (avg < 4) { label = "Bronze"; cssClass = "gcl-tier-bronze"; } 
  else if (avg < 10) { label = "Silver"; cssClass = "gcl-tier-silver"; } 
  else if (avg < 30) { label = "Gold"; cssClass = "gcl-tier-gold"; } 
  else { label = "Platinum"; cssClass = "gcl-tier-platinum"; }

  return { label, avgPerMonth: avg, cssClass };
}

function normalizeServiceType(raw) {
  const s = (raw || "").toUpperCase();
  if (s.includes("TRUCKING")) return "TRUCKING";
  if (s === "COLOAD" || s === "LCL") return "LCL EXPORT";
  if (s === "COLOAD IMPORT" || s === "SF IMPORT LCL") return "LCL IMPORT";
  if (s === "FCL") return "FCL EXPORT";
  if (s === "SF IMPORT FCL") return "FCL IMPORT";
  if (s === "CUSTOM") return "CUSTOM EXPORT";
  if (s === "AIR FREIGHT") return "AIR FREIGHT EXPORT";
  if (s === "MESCELLENEOUS") return "OTHER";
  return s || "OTHER";
}

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const DashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false); // Flag untuk indikator background sync

  // Teks loading dinamis untuk Skeleton Screen
  const [loadingText, setLoadingText] = useState("Menyiapkan Dashboard...");

  // Efek untuk teks Skeleton Dinamis
  useEffect(() => {
    if (!loading || profile) return; // Hanya jalan jika benar-benar belum ada data
    const messages = [
      "Menghitung total volume shipment...",
      "Memeriksa status invoice terakhir...",
      "Menyusun grafik pengeluaran...",
      "Hampir selesai..."
    ];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingText(messages[i]);
    }, 1500);
    return () => clearInterval(timer);
  }, [loading, profile]);

  // Efek Stale-While-Revalidate (SWR) Fetch Data
  useEffect(() => {
    let isMounted = true;
    
    // 1. Coba baca data dari localStorage (Cache)
    const cachedData = localStorage.getItem("gcl_dashboard_cache");
    if (cachedData) {
      try {
        setProfile(JSON.parse(cachedData));
        setLoading(false); // Langsung matikan loading karena data sudah ada
        setIsSyncing(true); // Nyalakan indikator bahwa kita sedang mengambil data baru di background
      } catch (e) {
        console.warn("Gagal parse cache dashboard", e);
      }
    } else {
      setLoading(true); // Hard load (Skeleton) jika benar-benar tidak ada cache
    }

    // 2. Fetch data terbaru dari server secara diam-diam
    const fetchFreshData = async () => {
      try {
        const json = await apiFetch("/customer_login/profile", { method: "GET" });
        
        if (isMounted) {
          if (!json.status) throw new Error(json.message || json.error || "Gagal load data dashboard");
          
          setProfile(json.data);
          setError(null);
          
          // Simpan data terbaru ke cache
          localStorage.setItem("gcl_dashboard_cache", JSON.stringify(json.data));
        }
      } catch (e) {
        console.error("Load dashboard error:", e);
        if (isMounted && !cachedData) setError(e.message); // Hanya tampilkan error keras jika cache juga kosong
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsSyncing(false); // Selesai sinkronisasi background
        }
      }
    };

    fetchFreshData();

    return () => { isMounted = false; };
  }, []);

  // --- DERIVED DATA ---
  const totalShipments = useMemo(() => {
    if (!profile?.total_shipment) return 0;
    return profile.total_shipment.reduce((sum, r) => sum + Number(r.total || 0), 0);
  }, [profile]);

  const customerTier = useMemo(() => getCustomerTierMeta(totalShipments), [totalShipments]);

  const shipmentMix = useMemo(() => {
    if (!profile?.total_shipment || !totalShipments) return [];
    const bucket = {};
    profile.total_shipment.forEach((row) => {
      const total = Number(row.total || 0);
      const label = normalizeServiceType(row.type_of_trans);
      if (!bucket[label]) bucket[label] = 0;
      bucket[label] += total;
    });
    return Object.entries(bucket).map(([name, value]) => ({
      name,
      value,
      percentage: totalShipments ? (value / totalShipments) * 100 : 0,
    }));
  }, [profile, totalShipments]);

  const volumeChartByMonth = useMemo(() => {
    const raw = profile?.volume_chart;
    if (!raw) return {};
    if (Array.isArray(raw)) return { ALL: raw };
    return raw;
  }, [profile]);

  const monthKeys = useMemo(() => Object.keys(volumeChartByMonth).sort(), [volumeChartByMonth]);

  const { topDestination, topDestinations, volumeComparisonData } = useMemo(() => {
    const destTotalMap = new Map(); 
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const formatMonthLabel = (ym) => {
      if (!ym || ym.indexOf("-") === -1) return ym;
      const [year, month] = ym.split("-");
      const idx = parseInt(month, 10) - 1;
      return `${MONTH_NAMES[idx] || ym} ${year.slice(2)}`;
    };

    monthKeys.forEach((month) => {
      const arr = volumeChartByMonth[month] || [];
      arr.forEach((row) => {
        const dest = row.destination || "Unknown";
        const vol = Number(row.total_volume || 0);
        destTotalMap.set(dest, (destTotalMap.get(dest) || 0) + vol);
      });
    });

    const sortedDest = Array.from(destTotalMap.entries()).sort((a, b) => b[1] - a[1]);
    const topDestinationEntry = sortedDest[0] || null;
    const topDestinationObj = topDestinationEntry ? { destination: topDestinationEntry[0], total_volume: topDestinationEntry[1] } : null;

    const TOP_N_DEST = 5;
    const topDestinationsArr = sortedDest.slice(0, TOP_N_DEST).map(([name]) => ({ name, key: name }));

    const comparisonData = monthKeys.map((month) => {
      const arr = volumeChartByMonth[month] || [];
      const rowObj = { month, label: formatMonthLabel(month) };
      topDestinationsArr.forEach((dest) => {
        const found = arr.find((r) => r.destination === dest.name);
        rowObj[dest.key] = found ? Number(found.total_volume || 0) : 0;
      });
      return rowObj;
    });

    return { topDestination: topDestinationObj, topDestinations: topDestinationsArr, volumeComparisonData: comparisonData };
  }, [monthKeys, volumeChartByMonth]);

  const spendingBookings = profile?.spending_bookings || [];

  const { spendingChartData } = useMemo(() => {
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const formatLabel = (bulanKe) => {
      if (!bulanKe || bulanKe.length !== 4) return bulanKe || "";
      const yy = bulanKe.substring(0, 2);
      const mm = bulanKe.substring(2, 4);
      return `${MONTH_NAMES[parseInt(mm, 10) - 1] || mm} ${yy}`;
    };

    const sorted = [...spendingBookings].sort((a, b) => String(a.bulan_ke).localeCompare(String(b.bulan_ke)));
    const data = sorted.map((row) => ({
      bulan_ke: row.bulan_ke,
      label: formatLabel(row.bulan_ke),
      spending: Number(row.total_price || 0),
    }));

    return { spendingChartData: data };
  }, [spendingBookings]);

  const totalSpendingYtd = useMemo(() => {
    if (!spendingBookings.length) return 0;
    return spendingBookings.reduce((sum, row) => sum + Number(row.total_price || 0), 0);
  }, [spendingBookings]);

  const lastBookings = profile?.last_bookings || [];
  const openInvoices = profile?.open_invoices || null;
  const shipper = profile?.shipper_detail || null;

  // ==========================================================
  // RENDER SKELETON SCREEN (Hanya muncul jika TIDAK ADA CACHE)
  // ==========================================================
  if (loading && !profile) {
    return (
      <GclLayout active="dashboard">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse-skeleton { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          .gcl-skeleton-box {
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            animation: pulse-skeleton 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}} />
        <div className="gcl-dashboard-page" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
            <div className="gcl-skeleton-box" style={{ width: "250px", height: "30px" }} />
            <div style={{ color: "#67e8f9", fontSize: "14px", fontWeight: "bold", animation: "pulse-skeleton 1.5s infinite" }}>
              {loadingText}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className="gcl-skeleton-box" style={{ height: "110px" }} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "20px" }}>
            <div className="gcl-skeleton-box" style={{ height: "320px" }} />
            <div className="gcl-skeleton-box" style={{ height: "320px" }} />
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <div className="gcl-skeleton-box" style={{ flex: 1, height: "300px" }} />
            <div className="gcl-skeleton-box" style={{ flex: 2, height: "300px" }} />
          </div>
        </div>
      </GclLayout>
    );
  }

  // ==========================================================
  // RENDER DASHBOARD ACTUAL
  // ==========================================================
  return (
    <GclLayout active="dashboard">
      <div className="gcl-dashboard-page">
        {/* BREADCRUMB + COMPANY NAME BAR */}
        <div className="gcl-dash-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="gcl-dash-breadcrumb">CUSTOMER PORTAL / DASHBOARD</div>
          
          {/* SWR Sync Indicator */}
          {isSyncing && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" }}>
               <svg className="animate-spin h-3 w-3 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Syncing fresh data...
            </div>
          )}
        </div>

        <div className="gcl-dash-company-row">
          <div>
            <h1 className="gcl-dash-company-name">
              {shipper?.shipper_name || "-"}
            </h1>
            <div className="gcl-dash-company-meta">
              Region: <span>Jakarta</span> • Payment:{" "}
              <span>{shipper?.payment || "CASH"}</span>
            </div>
          </div>
          {profile && (
            <div
              className={`gcl-dash-tier-badge ${customerTier.cssClass}`}
              title={customerTier.label}
            >
              <div className="gcl-tier-icon">
                <div className="gcl-tier-icon-inner" />
              </div>
              <div className="gcl-dash-tier-text">
                <div className="gcl-dash-tier-line1">CUSTOMER</div>
                <div className="gcl-dash-tier-line2">
                  ID {profile.id_shipper}
                </div>
                <div className="gcl-dash-tier-line3">
                  {customerTier.avgPerMonth.toFixed(1)} shipments / month
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SUMMARY ROW: TOTAL SHIPMENTS / OPEN INVOICES / TOP DEST */}
        <div className="gcl-dash-row gcl-dash-row-summary">
          {/* TOTAL SHIPMENTS */}
          <div className="gcl-card gcl-card-summary">
            <div className="gcl-card-label">TOTAL SHIPMENTS</div>
            <div className="gcl-card-summary-main">
              <div className="gcl-card-summary-number">{totalShipments}</div>
              <div className="gcl-card-summary-sub">
                {profile?.total_shipment ? `${profile.total_shipment.length} service types` : "-"}
              </div>
            </div>
          </div>

          {/* OPEN INVOICES */}
          <div className="gcl-card gcl-card-summary">
            <div className="gcl-card-label">OPEN INVOICES</div>
            <div className="gcl-card-summary-main">
              <div className="gcl-card-summary-number">
                {openInvoices ? openInvoices.total_invoices : "-"}
              </div>
              <div className="gcl-card-summary-sub">
                {openInvoices ? formatRupiah(openInvoices.total_grand_total) : "-"}
              </div>
            </div>
          </div>

          {/* TOP DESTINATION */}
          <div className="gcl-card gcl-card-summary">
            <div className="gcl-card-label">TOP DESTINATION</div>
            <div className="gcl-card-summary-main">
              <div className="gcl-card-summary-number">
                {topDestination?.destination || "-"}
              </div>
              <div className="gcl-card-summary-sub">
                {topDestination ? `${Number(topDestination.total_volume).toFixed(2)} m³ (YTD)` : "-"}
              </div>
            </div>
          </div>

          {/* TOTAL SPENDING YTD */}
          <div className="gcl-card gcl-card-summary">
            <div className="gcl-card-label">TOTAL SPENDING YTD</div>
            <div className="gcl-card-summary-main">
              <div className="gcl-card-summary-number">
                {formatRupiah(totalSpendingYtd)}
              </div>
              <div className="gcl-card-summary-sub">
                {spendingBookings.length ? `${spendingBookings.length} months` : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: SHIPMENT MIX + DESTINATION VOLUME COMPARISON */}
        <div className="gcl-dash-row gcl-dash-row-middle">
          {/* Freight Spending per Month */}
          <div className="gcl-card gcl-card-top-dest">
            <div className="gcl-card-header">
              <div>
                <div className="gcl-card-title">Freight Spending per Month</div>
              </div>
            </div>
            <div className="gcl-card-body" style={{ height: 280 }}>
              {!spendingChartData.length ? (
                <div className="gcl-table-empty">No spending data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spendingChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={formatShortIDR} />
                    <Tooltip
                      formatter={(value) => [formatRupiah(value), "Freight Spending"]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="spending"
                      name="Freight Spending"
                      stroke={PIE_COLORS[1]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Destination Volume Comparison */}
          <div className="gcl-card gcl-card-top-dest">
            <div className="gcl-card-header">
              <div className="gcl-card-title">
                Destination Volume Comparison (Top {topDestinations.length} Destinations)
              </div>
            </div>
            <div className="gcl-card-body" style={{ height: 280 }}>
              {!volumeComparisonData.length || !topDestinations.length ? (
                <div className="gcl-table-empty">No volume data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeComparisonData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {topDestinations.map((dest, idx) => (
                      <Line
                        key={dest.key}
                        type="monotone"
                        dataKey={dest.key}
                        name={dest.name}
                        stroke={PIE_COLORS[idx % PIE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: TABLES */}    
        <div className="gcl-dash-row gcl-dash-row-bottom">
          {/* Shipment Mix */}
          <div className="gcl-card gcl-card-mix">
            <div className="gcl-card-header">
              <div className="gcl-card-title">Shipments by Service Type</div>
            </div>

            <div className="gcl-card-mix-body">
              {/* Donut chart */}
              <div className="gcl-mix-pie">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shipmentMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {shipmentMix.map((entry, idx) => (
                        <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <text x="50%" y="45%" textAnchor="middle" fill="#ffffff" fontSize={22} fontWeight={700}>
                      {totalShipments}
                    </text>
                    <text x="50%" y="62%" textAnchor="middle" fill="#9ca3af" fontSize={11} letterSpacing={2}>
                      SHIPMENTS
                    </text>
                    <Tooltip
                      formatter={(value, name, props) => {
                        const item = shipmentMix.find((i) => i.name === props.payload.name);
                        const pct = item ? item.percentage.toFixed(1) : "0.0";
                        return [`${value} shipments (${pct}%)`, name];
                      }}
                      contentStyle={{ background: "#020617", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="gcl-mix-legend">
                {shipmentMix.map((d, idx) => (
                  <div key={d.name} className="gcl-mix-legend-item">
                    <span className="gcl-mix-legend-dot" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <div className="gcl-mix-legend-text">
                      <div className="gcl-mix-legend-name">{d.name}</div>
                      <div className="gcl-mix-legend-sub">
                        {d.value} <span>• {d.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      
          {/* Last bookings */}
          <div className="gcl-card gcl-card-table">
            <div className="gcl-card-header">
              <div className="gcl-card-title">Last Bookings</div>
            </div>
            <div className="gcl-table-wrapper">
              <table className="gcl-table">
                <thead>
                  <tr>
                    <th>ETD/ETA</th>
                    <th>Customer Ref</th>
                    <th>Vessel</th>
                    <th>Dest</th>
                    <th>BL</th>
                    <th>Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {lastBookings.map((b) => {
                    const trackingMeta = getTrackingStatusMeta(b.status_gocomet);
                    return (
                      <tr key={b.kode_ref}>
                        <td>{formatDateYmd(b.etd_jkt)+" / "+formatDateYmd(b.eta)}</td>
                        <td>{b.no_from_shipper || "-"}</td>
                        <td>{b.feeder_vessel || "-"}</td>
                        <td>{b.destination || "-"}</td>
                        <td>{b.hb_l}</td>
                        <td>
                        {b.hb_l ? (
                            <Link 
                                to={`/tracking?si_number=${encodeURIComponent(b.hb_l)}`}
                                className="gcl-tracking-link"
                                title="Click to Track"
                            >
                                <span className={`${trackingMeta.className} hover-scale`}>
                                    {trackingMeta.label} ↗
                                </span>
                            </Link>
                        ) : (
                            <span className={trackingMeta.className}>
                                {trackingMeta.label}
                            </span>
                        )}
                    </td>
                  </tr>
                    );
                  })}

                  {!lastBookings.length && (
                    <tr>
                      <td colSpan={7} className="gcl-table-empty">
                        Tidak ada data booking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {error && !profile && (
          <div className="gcl-dash-overlay error">
            Gagal memuat dashboard: {error}
          </div>
        )}
      </div>
    </GclLayout>
  );
};

export default DashboardPage;