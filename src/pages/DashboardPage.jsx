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
import "../styles/dashboard.css"; // sesuaikan path kalau beda

const PIE_COLORS = [
  "#ffd54f",
  "#4fc3f7",
  "#ff8a65",
  "#81c784",
  "#ba68c8",
  "#f06292",
  "#ffb74d",
];

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

  if (abs >= 1_000_000_000) {
    // milyar
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "b";
  }
  if (abs >= 1_000_000) {
    // juta
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  }
  if (abs >= 1_000) {
    // optional: ribuan
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }

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
  if (!s) {
    return {
      label: "Not Tracked",
      className: "gcl-pill-status gcl-pill-status-none",
    };
  }

  const u = s.toUpperCase();

  if (u === "ACTIVE") {
    return {
      label: "Active",
      className: "gcl-pill-status gcl-pill-status-active",
    };
  }

  if (u === "DELAYED" || u === "DELAY") {
    return {
      label: "Delayed",
      className: "gcl-pill-status gcl-pill-status-delayed",
    };
  }

  if (u === "PERFECT") {
    return {
      label: "Perfect",
      className: "gcl-pill-status gcl-pill-status-perfect",
    };
  }

  if (u === "PENDING") {
    return {
      label: "Pending",
      className: "gcl-pill-status gcl-pill-status-pending",
    };
  }

  if (u === "COMPLETED") {
    return {
      label: "Completed",
      className: "gcl-pill-status gcl-pill-status-completed",
    };
  }

  if (u === "EXPIRED") {
    return {
      label: "Expired",
      className: "gcl-pill-status gcl-pill-status-expired",
    };
  }

  if (u === "INVALID") {
    return {
      label: "Invalid",
      className: "gcl-pill-status gcl-pill-status-invalid",
    };
  }

  if (u === "DATA NOT FOUND") {
    return {
      label: "Data Not Found",
      className: "gcl-pill-status gcl-pill-status-data-not-found",
    };
  }

  if (u === "ACTION REQUIRED") {
    return {
      label: "Action Required",
      className: "gcl-pill-status gcl-pill-status-action-required",
    };
  }

  if (u === "PROBABLE DELAY") {
    return {
      label: "Probable Delay",
      className: "gcl-pill-status gcl-pill-status-probable-delay",
    };
  }

  if (u === "YET TO START") {
    return {
      label: "Yet to Start",
      className: "gcl-pill-status gcl-pill-status-yet",
    };
  }

  // fallback unknown
  return {
    label: s,
    className: "gcl-pill-status gcl-pill-status-none",
  };
}

function getCustomerTierMeta(totalShipments) {
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12

  if (!totalShipments || month <= 0) {
    return {
      label: "Bronze",
      avgPerMonth: 0,
      cssClass: "gcl-tier-bronze",
    };
  }

  const avg = totalShipments / month; // rata2 shipment / bulan

  let label = "Bronze";
  let cssClass = "gcl-tier-bronze";

  if (avg < 4) {
    label = "Bronze";
    cssClass = "gcl-tier-bronze";
  } else if (avg < 10) {
    label = "Silver";
    cssClass = "gcl-tier-silver";
  } else if (avg < 30) {
    label = "Gold";
    cssClass = "gcl-tier-gold";
  } else {
    label = "Platinum";
    cssClass = "gcl-tier-platinum";
  }

  return {
    label,
    avgPerMonth: avg,
    cssClass,
  };
}

function normalizeServiceType(raw) {
  const s = (raw || "").toUpperCase();

  if (s.includes("TRUCKING")) {
    return "TRUCKING";
  } else if (s === "COLOAD" || s === "LCL") {
    return "LCL EXPORT";
  } else if (s === "COLOAD IMPORT" || s === "SF IMPORT LCL") {
    return "LCL IMPORT";
  } else if (s === "FCL") {
    return "FCL EXPORT";
  } else if (s === "SF IMPORT FCL") {
    return "FCL IMPORT";
  } else if (s === "CUSTOM") {
    return "CUSTOM EXPORT";
  } else if (s === "AIR FREIGHT") {
    return "AIR FREIGHT EXPORT";
  } else if (s === "MESCELLENEOUS") {
    return "OTHER";
  }
  return s || "OTHER";
}

const DashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- LOAD DATA PROFIL / DASHBOARD ---
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const json = await apiFetch(
          "https://gateway-cl.com/api/customer_login/profile",
          {
            method: "GET",
          }
        );

        if (cancelled) return;

        if (!json.status) {
          throw new Error(
            json.message || json.error || "Gagal load data dashboard"
          );
        }

        setProfile(json.data);
      } catch (e) {
        console.error("Load dashboard error:", e);
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- DERIVED DATA ---

  // total shipment (dipakai untuk angka tengah donut dan %)
  const totalShipments = useMemo(() => {
    if (!profile?.total_shipment) return 0;
    return profile.total_shipment.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );
  }, [profile]);

  const customerTier = useMemo(
    () => getCustomerTierMeta(totalShipments),
    [totalShipments]
  );

  // shipment mix + persentase
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

  // ---- VOLUME CHART BARU (OBJECT PER BULAN) ----
  // profile.volume_chart sekarang: { "2025-01": [...], "2025-02": [...], ... }
  const volumeChartByMonth = useMemo(() => {
    const raw = profile?.volume_chart;
    if (!raw) return {};
    // fallback kalau API masih sempat kirim array
    if (Array.isArray(raw)) {
      return { ALL: raw };
    }
    return raw;
  }, [profile]);

  const monthKeys = useMemo(
    () => Object.keys(volumeChartByMonth).sort(),
    [volumeChartByMonth]
  );

  const {
    topDestination,
    topDestinations,
    volumeComparisonData,
  } = useMemo(() => {
    const destTotalMap = new Map(); // destination -> total volume sepanjang tahun

    const MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formatMonthLabel = (ym) => {
      if (!ym || ym.indexOf("-") === -1) return ym;
      const [year, month] = ym.split("-");
      const idx = parseInt(month, 10) - 1;
      const mName = MONTH_NAMES[idx] || ym;
      return `${mName} ${year.slice(2)}`; // contoh: "Jan 25"
    };

    // 1) hitung total volume per destination (YTD)
    monthKeys.forEach((month) => {
      const arr = volumeChartByMonth[month] || [];
      arr.forEach((row) => {
        const dest = row.destination || "Unknown";
        const vol = Number(row.total_volume || 0);
        destTotalMap.set(dest, (destTotalMap.get(dest) || 0) + vol);
      });
    });

    const sortedDest = Array.from(destTotalMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const topDestinationEntry = sortedDest[0] || null;
    const topDestinationObj = topDestinationEntry
      ? {
          destination: topDestinationEntry[0],
          total_volume: topDestinationEntry[1],
        }
      : null;

    const TOP_N_DEST = 5;
    const topDestinationsArr = sortedDest.slice(0, TOP_N_DEST).map(([name]) => ({
      name,
      key: name, // boleh pakai nama langsung untuk dataKey di Recharts
    }));

    // 2) bangun data untuk LineChart: 1 baris = 1 bulan
    const comparisonData = monthKeys.map((month) => {
      const arr = volumeChartByMonth[month] || [];
      const rowObj = {
        month,
        label: formatMonthLabel(month),
      };

      topDestinationsArr.forEach((dest) => {
        const found = arr.find((r) => r.destination === dest.name);
        rowObj[dest.key] = found ? Number(found.total_volume || 0) : 0;
      });

      return rowObj;
    });

    return {
      topDestination: topDestinationObj,
      topDestinations: topDestinationsArr,
      volumeComparisonData: comparisonData,
    };
  }, [monthKeys, volumeChartByMonth]);

  // ---- SPENDING BOOKINGS → GRAFIK BIAYA FREIGHT PER BULAN ----
  const spendingBookings = profile?.spending_bookings || [];

  const { spendingChartData, totalSpending } = useMemo(() => {
    const MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formatLabel = (bulanKe) => {
      // contoh: "2501" → "Jan 25"
      if (!bulanKe || bulanKe.length !== 4) return bulanKe || "";
      const yy = bulanKe.substring(0, 2);
      const mm = bulanKe.substring(2, 4);
      const idx = parseInt(mm, 10) - 1;
      const mName = MONTH_NAMES[idx] || mm;
      return `${mName} ${yy}`;
    };

    const sorted = [...spendingBookings].sort((a, b) =>
      String(a.bulan_ke).localeCompare(String(b.bulan_ke))
    );

    const data = sorted.map((row) => {
      const val = Number(row.total_price || 0);
      return {
        bulan_ke: row.bulan_ke,
        label: formatLabel(row.bulan_ke),
        spending: val,
      };
    });

    const total = data.reduce((sum, r) => sum + (r.spending || 0), 0);

    return {
      spendingChartData: data,
      totalSpending: total,
    };
  }, [spendingBookings]);

  const totalSpendingYtd = useMemo(() => {
    if (!spendingBookings.length) return 0;
    return spendingBookings.reduce(
      (sum, row) => sum + Number(row.total_price || 0),
      0
    );
  }, [spendingBookings]);


  const latestInvoices = profile?.latest_invoices || [];
  const lastBookings = profile?.last_bookings || [];
  const openInvoices = profile?.open_invoices || null;
  const shipper = profile?.shipper_detail || null;

  return (
    <GclLayout active="dashboard">
      <div className="gcl-dashboard-page">
        {/* BREADCRUMB + COMPANY NAME BAR */}
        <div className="gcl-dash-header-bar">
          <div className="gcl-dash-breadcrumb">CUSTOMER PORTAL / DASHBOARD</div>
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
              {profile?.total_shipment
                ? `${profile.total_shipment.length} service types`
                : "-"}
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
              {openInvoices
                ? formatRupiah(openInvoices.total_grand_total)
                : "-"}
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
              {topDestination
                ? `${Number(topDestination.total_volume).toFixed(2)} m³ (YTD)`
                : "-"}
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
              {/* bebas mau isi apa */}
              {spendingBookings.length
                ? `${spendingBookings.length} months`
                : "-"}
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
                <div className="gcl-card-title">
                  Freight Spending per Month
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginTop: 4,
                  }}
                >
                </div>
              </div>
            </div>
            <div className="gcl-card-body" style={{ height: 280 }}>
              {!spendingChartData.length ? (
                <div className="gcl-table-empty">
                  No spending data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={spendingChartData}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={formatShortIDR} />
                    <Tooltip
                      formatter={(value) => [
                        formatRupiah(value),
                        "Freight Spending",
                      ]}
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

          {/* Destination Volume Comparison (per Month, Top N Destinations) */}
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
                  <LineChart
                    data={volumeComparisonData}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
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
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>

                    {/* Angka & label di tengah donut */}
                    <text
                      x="50%"
                      y="45%"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={22}
                      fontWeight={700}
                    >
                      {totalShipments}
                    </text>
                    <text
                      x="50%"
                      y="62%"
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize={11}
                      letterSpacing={2}
                    >
                      SHIPMENTS
                    </text>

                    <Tooltip
                      formatter={(value, name, props) => {
                        const item = shipmentMix.find(
                          (i) => i.name === props.payload.name
                        );
                        const pct = item
                          ? item.percentage.toFixed(1)
                          : "0.0";
                        return [`${value} shipments (${pct}%)`, name];
                      }}
                      contentStyle={{
                        background: "#020617",
                        borderRadius: 8,
                        border: "1px solid rgba(148,163,184,0.5)",
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend: nama + jumlah + persen */}
              <div className="gcl-mix-legend">
                {shipmentMix.map((d, idx) => (
                  <div key={d.name} className="gcl-mix-legend-item">
                    <span
                      className="gcl-mix-legend-dot"
                      style={{
                        backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                      }}
                    />
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
                        {/* UPDATE: LINK KE TRACKING */}
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

        {loading && <div className="gcl-dash-overlay">Loading dashboard…</div>}
        {error && !loading && (
          <div className="gcl-dash-overlay error">
            Gagal memuat dashboard: {error}
          </div>
        )}
      </div>
    </GclLayout>
  );
};

export default DashboardPage;
