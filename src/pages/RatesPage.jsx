// src/pages/RatesPage.jsx
import { useState, useEffect, useMemo } from "react";
import GclLayout from "../layouts/GclLayout";
import QuoteRequestModal from "./QuoteRequestModal"; // <--- IMPORT COMPONENT BARU
import "../styles/rates.css";

const API_URL = "https://gateway-cl.com/api/Feeder_rate?X-API-KEY=gateway-fms";

function addMarkup20(value) {
  const num = Number(value || 0);
  return Math.round(num * 1.2 * 100) / 100;
}

const AIRLINE_LOGOS = {
  CI: "../src/assets/Airlines/ci.png",
  TK: "../src/assets/Airlines/tk.png",
  JT: "../src/assets/Airlines/jt.png",
  MH: "../src/assets/Airlines/mh.png",
  SV: "../src/assets/Airlines/sv.png",
  GA: "../src/assets/Airlines/ga.png",
};

function getAirlineLogo(code) {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return AIRLINE_LOGOS[upper] || null;
}

function renderAirlineCell(row) {
  const code = (row.airline_code || "").trim().toUpperCase();
  const logoSrc = getAirlineLogo(code);

  return (
    <div className="gcl-airline-cell">
      {logoSrc && (
        <img
          src={logoSrc}
          alt={row.airline || code || "Airline"}
          className="gcl-airline-logo"
        />
      )}
      <div className="gcl-airline-name">
        {row.airline || code || "-"}
      </div>
    </div>
  );
}

function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RatesPage() {
  const [service, setService] = useState("lcl"); // "lcl" | "fcl" | "air"
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [rates, setRates] = useState({ lcl: [], fcl: [], air: [] });
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- STATE UNTUK MODAL ---
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedRateForQuote, setSelectedRateForQuote] = useState(null);

  // --- HANDLER BUKA MODAL ---
  const handleOpenQuote = (row, serviceType) => {
    // Kita gabungkan data row dengan tipe service agar modal tahu ini LCL/FCL/Air
    setSelectedRateForQuote({ ...row, serviceType });
    setIsQuoteModalOpen(true);
  };

  // --- FETCH DATA DARI API ---
  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`Failed to load rates: ${res.status}`);
        }

        const json = await res.json();
        const seaLclRaw = json?.data?.sea?.lcl || [];
        const seaFclRaw = json?.data?.sea?.fcl || [];
        const airRaw = json?.data?.air || [];

        // LCL: Validasi rate
        const lclRaw = Array.isArray(seaLclRaw)
          ? seaLclRaw.filter(
              (row) =>
                row.rate_per_cbm != null &&
                !isNaN(Number(row.rate_per_cbm))
            )
          : [];

        // FCL: Validasi freight
        const fclRaw = Array.isArray(seaFclRaw)
          ? seaFclRaw.filter(
              (row) =>
                row.size &&
                row.freight != null &&
                !isNaN(Number(row.freight))
            )
          : [];

        // Apply markup
        const lcl = lclRaw.map((row, idx) => ({
          ...row,
          id: row.id || `lcl-${idx}`,
          rate_per_cbm_public: addMarkup20(row.rate_per_cbm),
        }));

        const fcl = fclRaw.map((row, idx) => ({
          ...row,
          id: row.id || `fcl-${idx}`,
          freight_public: addMarkup20(row.freight),
        }));

        const air = airRaw.map((row, idx) => ({
          ...row,
          id: row.id || `air-${idx}`,
          minimum_public: addMarkup20(row.minimum),
          normal_public: row.normal != null ? addMarkup20(row.normal) : null,
          rate_45_public: row.rate_45 != null ? addMarkup20(row.rate_45) : null,
          rate_100_public: row.rate_100 != null ? addMarkup20(row.rate_100) : null,
          rate_300_public: row.rate_300 != null ? addMarkup20(row.rate_300) : null,
          rate_500_public: row.rate_500 != null ? addMarkup20(row.rate_500) : null,
          rate_1000_public: row.rate_1000 != null ? addMarkup20(row.rate_1000) : null,
        }));

        setRates({ lcl, fcl, air });

        // Hitung lastUpdated
        const allValids = [...seaLclRaw, ...seaFclRaw, ...airRaw]
          .map((r) => r.valid)
          .filter(Boolean);

        if (allValids.length > 0) {
          let newest = allValids[0];
          allValids.forEach((v) => {
            if (v > newest) newest = v;
          });
          setLastUpdated(newest);
        } else {
          setLastUpdated("");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load rates");
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const allRates = useMemo(() => {
    return rates[service] || [];
  }, [rates, service]);

  const filteredRates = useMemo(() => {
    if (!allRates || allRates.length === 0) return [];
    const o = origin.trim().toLowerCase();
    const d = destination.trim().toLowerCase();

    if (!o && !d) return allRates;

    return allRates.filter((row) => {
      const originText = `${row.origin || ""} ${row.origin_code || ""}`.toLowerCase();
      const destText = `${row.destination || ""} ${row.destination_code || ""}`.toLowerCase();
      const matchO = o ? originText.includes(o) : true;
      const matchD = d ? destText.includes(d) : true;
      return matchO && matchD;
    });
  }, [allRates, origin, destination]);

  const fclGroups = useMemo(() => {
    if (service !== "fcl") return {};
    return filteredRates.reduce((acc, row) => {
      const laneLabel = `${row.origin || "JAKARTA"} – ${row.destination || "-"}`;
      if (!acc[laneLabel]) acc[laneLabel] = { laneLabel, rows: [] };
      acc[laneLabel].rows.push(row);
      return acc;
    }, {});
  }, [filteredRates, service]);

  const fclGroupKeys = Object.keys(fclGroups);

  const airGroups = useMemo(() => {
    if (service !== "air") return {};
    return filteredRates.reduce((acc, row) => {
      const laneLabel = `${row.origin_code || "-"} (${row.origin || "-"}) - ${row.destination_code || "-"} (${row.destination || "-"})`;
      if (!acc[laneLabel]) acc[laneLabel] = { laneLabel, rows: [] };
      acc[laneLabel].rows.push(row);
      return acc;
    }, {});
  }, [filteredRates, service]);

  const airGroupKeys = Object.keys(airGroups);

  return (
    <GclLayout>
      <div className="gcl-rates-page">
        <div className="gcl-rates-header">
          <div>
            <div className="gcl-rates-breadcrumb">CUSTOMER PORTAL / RATES</div>
            <h1 className="gcl-rates-title">Rate &amp; Tariff</h1>
            <p className="gcl-rates-subtitle">
              Public all-in rates for LCL, FCL and Airfreight (Export)
            </p>
          </div>
          <div className="gcl-rates-header-right">
            <div className="gcl-rates-service-tabs">
              <button
                type="button"
                className={"gcl-rates-service-tab " + (service === "lcl" ? "active" : "")}
                onClick={() => setService("lcl")}
              >
                LCL Export
              </button>
              <button
                type="button"
                className={"gcl-rates-service-tab " + (service === "fcl" ? "active" : "")}
                onClick={() => setService("fcl")}
              >
                FCL Export
              </button>
              <button
                type="button"
                className={"gcl-rates-service-tab " + (service === "air" ? "active" : "")}
                onClick={() => setService("air")}
              >
                Airfreight
              </button>
            </div>
          </div>
        </div>

        <div className="gcl-rates-card">
          <div className="gcl-rates-filters">
            <div className="gcl-form-control">
              <label className="gcl-form-label">Origin</label>
              <input
                className="gcl-form-input"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="ORIGIN CODE"
              />
            </div>
            <div className="gcl-form-control">
              <label className="gcl-form-label">Destination</label>
              <input
                className="gcl-form-input"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="DESTINATION CODE"
              />
            </div>
            <div className="gcl-rates-last-updated">
              Last updated: <strong>{lastUpdated || "-"}</strong>
            </div>
          </div>

          <div className="gcl-rates-summary">
            <div className="gcl-rates-summary-main">
              {service === "lcl" && (
                <>
                  <div className="gcl-rates-summary-title">LCL All-In Consol Service (Export)</div>
                  <div className="gcl-rates-summary-meta">Public rate • Min CBM as per lane • Subject to local charges</div>
                </>
              )}
              {service === "fcl" && (
                <>
                  <div className="gcl-rates-summary-title">FCL All-In Ocean Freight (Export)</div>
                  <div className="gcl-rates-summary-meta">20' / 40' / 40HC • Public rate (+20% markup) • Free time as per carrier</div>
                </>
              )}
              {service === "air" && (
                <>
                  <div className="gcl-rates-summary-title">Airport-to-Airport Airfreight</div>
                  <div className="gcl-rates-summary-meta">IDR tariff • Min charge &amp; brackets per airline • Subject to surcharges</div>
                </>
              )}
            </div>
            <div className="gcl-rates-summary-badge">Public Rate</div>
          </div>

          {loading && <div className="gcl-rates-loading">Loading public rates...</div>}
          {error && !loading && <div className="gcl-rates-error">Error: {error}</div>}

          {!loading && !error && (
            <div className="gcl-rates-results">
              {filteredRates.length === 0 && (
                <div className="gcl-rates-empty">No rates found for this filter.</div>
              )}

              {/* LCL TABLE */}
              {service === "lcl" && filteredRates.length > 0 && (
                <div className="gcl-rates-table-wrapper">
                  <table className="gcl-rates-table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Rate</th>
                        <th>Minimum</th>
                        <th>Free Time</th>
                        <th>Valid</th>
                        <th>Notes</th>
                        <th style={{ textAlign: "center", width: 140 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRates.map((row, idx) => (
                        <tr key={row.id || `lcl-row-${idx}`}>
                          <td>
                            <div className="gcl-rates-lane">
                              {(row.origin || "JAKARTA") + " – " + (row.destination || "-")}
                            </div>
                          </td>
                          <td>
                            <strong>{row.currency || "USD"} {formatMoney(row.rate_per_cbm_public)} / CBM</strong>
                          </td>
                          <td>{row.min_cbm || 1} CBM</td>
                          <td>{row.free_time || "-"}</td>
                          <td>{row.valid || "-"}</td>
                          <td>{row.note || "-"}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="gcl-book-pill-btn"
                              onClick={() => handleOpenQuote(row, "LCL Export")}
                            >
                              Get Quote
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* FCL GROUPED */}
              {service === "fcl" && filteredRates.length > 0 && (
                <div className="gcl-rates-fcl-groups">
                  {fclGroupKeys.map((lane) => {
                    const group = fclGroups[lane];
                    return (
                      <div key={lane} className="gcl-rates-fcl-card">
                        <div className="gcl-rates-fcl-header">{group.laneLabel}</div>
                        <table className="gcl-rates-table gcl-rates-table--inner">
                          <thead>
                            <tr>
                              <th>Carrier</th>
                              <th>Size</th>
                              <th>All-in Freight</th>
                              <th>Free Time</th>
                              <th>Valid</th>
                              <th>Notes</th>
                              <th style={{ textAlign: "center", width: 130 }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((row, idx) => (
                              <tr key={row.id || `fcl-row-${idx}`}>
                                <td>{row.carrier || "-"}</td>
                                <td>{row.size || "-"}</td>
                                <td>
                                  <strong>{row.currency || "USD"} {formatMoney(row.freight_public)}</strong>
                                </td>
                                <td>{row.free_time || "-"}</td>
                                <td>{row.valid || "-"}</td>
                                <td>{row.note || "-"}</td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    className="gcl-book-pill-btn"
                                    onClick={() => handleOpenQuote(row, "FCL Export")}
                                  >
                                    Get Quote
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AIR GROUPED */}
              {service === "air" && filteredRates.length > 0 && (
                <div className="gcl-rates-fcl-groups">
                  {airGroupKeys.map((lane) => {
                    const group = airGroups[lane];
                    return (
                      <div key={lane} className="gcl-rates-fcl-card">
                        <div className="gcl-rates-fcl-header">{group.laneLabel}</div>
                        <table className="gcl-rates-table gcl-rates-table--inner">
                          <thead>
                            <tr>
                              <th>Airline</th>
                              <th>M</th>
                              <th>N</th>
                              <th>45</th>
                              <th>100</th>
                              <th>300</th>
                              <th>500</th>
                              <th>1000</th>
                              <th className="gcl-col-action">Booking</th>
                              <th className="gcl-col-remark">Remark</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((row, idx) => (
                              <tr key={row.id || `air-row-${idx}`}>
                                <td>{renderAirlineCell(row)}</td>
                                <td>{row.minimum_public != null ? `${formatMoney(row.minimum_public)}` : "-"}</td>
                                <td>{row.normal_public != null ? `${formatMoney(row.normal_public)}` : "-"}</td>
                                <td>{row.rate_45_public != null ? `${formatMoney(row.rate_45_public)}` : "-"}</td>
                                <td>{row.rate_100_public != null ? `${formatMoney(row.rate_100_public)}` : "-"}</td>
                                <td>{row.rate_300_public != null ? `${formatMoney(row.rate_300_public)}` : "-"}</td>
                                <td>{row.rate_500_public != null ? `${formatMoney(row.rate_500_public)}` : "-"}</td>
                                <td>{row.rate_1000_public != null ? `${formatMoney(row.rate_1000_public)}` : "-"}</td>
                                <td className="gcl-col-action">
                                  <button
                                    type="button"
                                    className="gcl-book-pill-btn"
                                    onClick={() => handleOpenQuote(row, "Airfreight")}
                                  >
                                    Get quote
                                  </button>
                                </td>
                                <td className="gcl-col-remark">{row.remarks || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="gcl-rates-footer-note">
            *Rates shown are public, subject to space, equipment and surcharges at time of booking.
          </div>
        </div>
      </div>

      {/* RENDER MODAL DISINI */}
      <QuoteRequestModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        rateData={selectedRateForQuote}
      />
    </GclLayout>
  );
}