// src/pages/SchedulePage.jsx
import { useState, useEffect } from "react";
import GclLayout from "../layouts/GclLayout";
import "../styles/schedule.css";

const API_BASE =
  import.meta?.env?.VITE_GCL_API_BASE_URL || "https://gateway-cl.com/api";

export default function SchedulePage() {
  const [mode, setMode] = useState("export"); // "export" | "import"
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [data, setData] = useState({ direct: [], via: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // opsi bulan (bulan ini + 3 bulan)
  const monthOptions = (() => {
    const options = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 0; i < 4; i++) {
      const d = new Date(base);
      d.setMonth(base.getMonth() + i);
      const value = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;
      const label = d.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      options.push({ value, label });
    }
    return options;
  })();

  // fetch data
  useEffect(() => {
    let aborted = false;

    async function fetchSchedule() {
      setLoading(true);
      setError("");

      try {
        const url =
          mode === "export"
            ? `${API_BASE}/schedule?X-API-KEY=gateway-fms`
            : `${API_BASE}/schedule_import?X-API-KEY=gateway-fms`;

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        const payload =
          Array.isArray(json.data) && json.data.length > 0
            ? json.data[0]
            : { direct: [], via: [] };

        if (!aborted) {
          setData({
            direct: payload.direct || [],
            via: payload.via || [],
          });
        }
      } catch (err) {
        console.error(err);
        if (!aborted) {
          setError("Failed to load schedule. Please try again.");
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    }

    fetchSchedule();
    return () => {
      aborted = true;
    };
  }, [mode, month]);

  const isExport = mode === "export";

  // gabung direct + via jadi satu list
  const mergedRows = [
    ...(data.direct || []).map((row) => ({ ...row, _type: "direct" })),
    ...(data.via || []).map((row) => ({ ...row, _type: "via" })),
  ];

  // filter origin/destination
  const filteredRows = mergedRows.filter((row) => {
    const originText = (row.origin_name || row.origin_id || "")
      .toString()
      .toLowerCase();

    const destText = isExport
      ? (row.destination_name || row.destination_id || "")
          .toString()
          .toLowerCase()
      : (row.region_id || "").toString().toLowerCase();

    const matchOrigin = origin
      ? originText.includes(origin.toLowerCase())
      : true;
    const matchDest = destination
      ? destText.includes(destination.toLowerCase())
      : true;

    return matchOrigin && matchDest;
  });

  // kelompokkan per Origin - Destination + kumpulkan via city
  const groups = filteredRows.reduce((acc, row) => {
    const originLabel = (row.origin_name || row.origin_id || "")
      .toString()
      .toUpperCase();
    const destLabel = isExport
      ? (row.destination_name || row.destination_id || "")
          .toString()
          .toUpperCase()
      : (row.region_id || "").toString().toUpperCase();

    const key = `${originLabel}|||${destLabel}`;
    if (!acc[key]) {
      acc[key] = {
        origin: originLabel,
        destination: destLabel,
        rows: [],
        viaCities: new Set(), // kumpulkan kota VIA di sini
      };
    }

    acc[key].rows.push(row);

    if (row._type === "via") {
      const viaRaw = row.etd_city_con_name || row.etd_city_con_id || "";
      const viaName = viaRaw.toString().toUpperCase().trim();
      if (viaName) {
        acc[key].viaCities.add(viaName);
      }
    }

    return acc;
  }, {});

  const groupKeys = Object.keys(groups).sort();

  return (
    <GclLayout>
      <div className="gcl-schedule-page">
        {/* Header atas */}
        <div className="gcl-schedule-header">
          <div>
            <div className="gcl-schedule-breadcrumb">
              CUSTOMER PORTAL / SCHEDULE
            </div>
            <div className="gcl-schedule-title">Ship Schedule</div>
            <div className="gcl-schedule-subtitle">
              Latest LCL schedules for Gateway Container Line
            </div>
          </div>

          {/* switch Export / Import */}
          <div className="gcl-schedule-tabs">
            <button
              type="button"
              className={
                "gcl-schedule-tab " +
                (mode === "export" ? "gcl-schedule-tab-active" : "")
              }
              onClick={() => setMode("export")}
            >
              Export
            </button>
            <button
              type="button"
              className={
                "gcl-schedule-tab " +
                (mode === "import" ? "gcl-schedule-tab-active" : "")
              }
              onClick={() => setMode("import")}
            >
              Import
            </button>
          </div>
        </div>

        <div>
          {/* filter bar */}
          <div className="gcl-schedule-filters">
            <div className="gcl-form-control">
              <label className="gcl-form-label">Origin</label>
              <input
                className="gcl-form-input"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder={
                  isExport ? "Port of loading" : "Port of destination"
                }
              />
            </div>

            <div className="gcl-form-control">
              <label className="gcl-form-label">
                {isExport ? "Destination" : "Destination (Region)"}
              </label>
              <input
                className="gcl-form-input"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={
                  isExport ? "Port of destination" : "Port of loading"
                }
              />
            </div>

            {/* <div className="gcl-form-control">
              <label className="gcl-form-label">Month</label>
              <select
                className="gcl-form-input"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div> */}
          </div>

          {/* hasil */}
          <div className="gcl-schedule-results">
            {loading && (
              <div className="gcl-schedule-loading">
                Loading schedules...
              </div>
            )}

            {error && !loading && (
              <div className="gcl-schedule-error">{error}</div>
            )}

            {!loading && !error && groupKeys.length === 0 && (
              <div className="gcl-schedule-empty">
                No schedule found for this filter.
              </div>
            )}

            {!loading &&
              !error &&
              groupKeys.map((key) => {
                const group = groups[key];
                const viaCities = Array.from(group.viaCities || []);
                const headerLabel =
                  viaCities.length > 0
                    ? `${group.origin} - ${viaCities[0]} - ${group.destination}`
                    : `${group.origin} - ${group.destination}`;

                return (
                  <div
                    key={key}
                    className="gcl-schedule-table-wrapper"
                    style={{
                      marginBottom: 16,
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    {/* header group: JAKARTA - SINGAPORE - JEBEL ALI */}
                    <div
                      style={{
                        background: "#1d4ed8",
                        color: "#f9fafb",
                        padding: "8px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: "right",
                        textTransform: "uppercase",
                      }}
                    >
                      {headerLabel}
                    </div>
                   <table className="gcl-schedule-table">
                      <thead>
                        <tr
                          style={{
                            background: "#facc15",
                            color: "#111827",
                            textTransform: "uppercase",
                            fontSize: 11,
                          }}
                        >
                          <th>Vessel</th>
                          <th>Voyage</th>
                          <th>Closing Date</th>
                          <th>ETD POL</th>
                          <th>ETA POD</th>
                          <th className="gcl-col-booking">Booking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, idx) => {
                          const isVia = row._type === "via";

                          const vessel = isVia
                            ? `${row.vessel || ""}${
                                row.connecting_vessel ? " / " + row.connecting_vessel : ""
                              }`
                            : row.vessel;

                          const voyage = isVia
                            ? `${row.voy_vessel || ""}${row.voy_con ? " / " + row.voy_con : ""}`
                            : row.voyage;

                          const closing = isVia ? row.stf_cls || "" : row.closing_date || "";
                          const etd = isVia ? row.etd_jkt || row.etd || "" : row.etd || "";
                          const eta = row.eta || "";

                          return (
                            <tr key={key + "-" + idx}>
                              <td>{vessel}</td>
                              <td>{voyage}</td>
                              <td>{closing}</td>
                              <td>{etd}</td>
                              <td>{eta}</td>
                              <td className="gcl-col-booking-cell">
                                <button
                                  type="button"
                                  className="gcl-booking-btn"
                                  onClick={() => {
                                    // TODO: sambungkan ke flow booking / prefill form
                                    console.log("Booking clicked", {
                                      origin: group.origin,
                                      destination: group.destination,
                                      vessel,
                                      voyage,
                                      etd,
                                    });
                                  }}
                                >
                                  Book
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </div>

          {!loading && !error && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              Showing <strong>{filteredRows.length}</strong> sailing(s) in{" "}
              {groupKeys.length} lane(s).
            </div>
          )}
        </div>
      </div>
    </GclLayout>
  );
}
