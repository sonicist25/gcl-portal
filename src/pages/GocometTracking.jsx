// src/components/GocometTracking.jsx
import { useEffect, useState } from "react";
import GclLayout from "../layouts/GclLayout";
import "../styles/gocometTracking.css";

function formatDateFromISO(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr; // kalau gagal parse, tampilkan apa adanya
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return (
    pad(d.getDate()) +
    "/" +
    pad(d.getMonth() + 1) +
    "/" +
    d.getFullYear() +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

function getStatusClass(statusText) {
  if (!statusText) return "";
  const s = statusText.toLowerCase();
  if (s.includes("complete")) return "completed";
  if (s.includes("transit") || s.includes("ongoing")) return "transit";
  if (s.includes("delay")) return "delayed";
  return "";
}

function GocometTracking({ defaultSiNumber = "JESMZJ-GCL2517855" }) {
  const [inputSi, setInputSi] = useState(defaultSiNumber);
  const [activeSi, setActiveSi] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ambil si_number dari query string kalau ada
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qSi = params.get("si_number");
      if (qSi) {
        setInputSi(qSi);
        setActiveSi(qSi);
      } else if (defaultSiNumber) {
        setActiveSi(defaultSiNumber);
      }
    } catch {
      if (defaultSiNumber) setActiveSi(defaultSiNumber);
    }
  }, [defaultSiNumber]);

  useEffect(() => {
    if (!activeSi) return;

    const load = async () => {
      setLoading(true);
      setMessage(`Loading data tracking untuk ${activeSi}...`);
      setError("");
      setData(null);

      const url =
        "https://gateway-cl.com/api/track_gocomet" +
        "?X-API-KEY=gateway-fms" +
        "&si_number=" +
        encodeURIComponent(activeSi);

      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        const json = await res.json();
        setData(json);
        setMessage("");
      } catch (e) {
        console.error(e);
        setError("Gagal memuat data tracking. " + e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeSi]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputSi.trim();
    if (!trimmed) {
      setError("SI Number tidak boleh kosong.");
      return;
    }
    setError("");
    setActiveSi(trimmed);
  };

  // ----- helper render -----
  const headerData = data?.header || [];
  let headerObj = null;
  if (Array.isArray(headerData) && headerData.length > 0) {
    if (Array.isArray(headerData[0]) && headerData[0].length > 0) {
      headerObj = headerData[0][0];
    } else if (typeof headerData[0] === "object") {
      headerObj = headerData[0];
    }
  }

  const routing = data?.routing || [];
  const stepper = data?.stepper || [];
  const eventList = data?.["event list"] || data?.event_list || [];

  const statusText = headerObj?.status || "-";
  const statusClass = getStatusClass(statusText);

  return (
    <GclLayout>
    <div className={`gocomet-wrap ${loading ? "loading" : ""}`}>
      {/* FORM SI NUMBER */}
      <form className="gocomet-form" onSubmit={handleSubmit}>
        <div className="gocomet-form-group">
          <label htmlFor="gocomet-si" className="gocomet-label-main">
            SI Number
          </label>
          <input
            id="gocomet-si"
            type="text"
            className="gocomet-input"
            value={inputSi}
            onChange={(e) => setInputSi(e.target.value)}
            placeholder="Masukkan SI Number (mis: JESMZJ-GCL2517855)"
          />
        </div>
        <button type="submit" className="gocomet-btn">
          Track
        </button>
      </form>

    {/* HEADER */}
{headerObj && (
  <div className="gocomet-header-card">
    {/* Row 1 */}
    <div className="gocomet-header-row">
      <div className="gocomet-header-item">
        <div className="gocomet-label">Status</div>
        <div className={`gocomet-status ${statusClass}`}>{statusText}</div>
      </div>
      <div className="gocomet-header-item">
        <div className="gocomet-label">SCAC</div>
        <div className="gocomet-value">{headerObj.scac || "-"}</div>
      </div>
      <div className="gocomet-header-item">
        <div className="gocomet-label">Container No</div>
        <div className="gocomet-value">{headerObj["container no"] || "-"}</div>
      </div>
      <div className="gocomet-header-item">
        <div className="gocomet-label">Last Update</div>
        <div className="gocomet-value">
          {formatDateFromISO(headerObj["last update"])}
        </div>
      </div>
      <div className="gocomet-header-item">
        <div className="gocomet-label">Delay / Transit</div>
        <div className="gocomet-value">{headerObj.delay || "-"}</div>
      </div>
    </div>

    {/* Row 2 - Catatan */}
    {headerObj.arrived && (
      <div className="gocomet-header-note">
        <span className="note-title">POL Radar:</span> {headerObj.arrived}
      </div>
    )}
  </div>
)}

      {/* ROUTING */}
      <div className="gocomet-block">
        <div className="gocomet-block-title">Routing &amp; Vessel</div>
        <div className="gocomet-routing">
          {routing && routing.length > 0 ? (
            routing.map((r, idx) => {
              const vessel = r.vessel || "-";
              const cont = r.container || "-";
              const pol = r["port of loading"] || r.port_of_loading || "-";
              const pod =
                r["port of discharge"] || r.port_of_discharge || "-";
              const etd = r["time of departure"] || "";
              const eta = r["time of discharge"] || "";

              return (
                <div className="gocomet-routing-card" key={idx}>
                  <div className="gocomet-routing-line">
                    <span className="gocomet-routing-label">Vessel: </span>
                    {vessel}
                  </div>
                  <div className="gocomet-routing-line">
                    <span className="gocomet-routing-label">Container: </span>
                    {cont}
                  </div>
                  <div className="gocomet-routing-line">
                    <span className="gocomet-routing-label">POL: </span>
                    {pol}
                  </div>
                  <div className="gocomet-routing-line">
                    <span className="gocomet-routing-label">POD: </span>
                    {pod}
                  </div>
                  {(etd || eta) && (
                    <div className="gocomet-routing-line">
                      <span className="gocomet-routing-label">
                        ETD / ETA:{" "}
                      </span>
                      {(etd || "-") + " ➝ " + (eta || "-")}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="gocomet-empty">
              Tidak ada data routing untuk SI ini.
            </div>
          )}
        </div>
      </div>

      {/* STEPPER */}
      <div className="gocomet-block">
        <div className="gocomet-block-title">Journey Stepper</div>
        <div className="gocomet-stepper">
          {stepper && stepper.length > 0 ? (
            stepper.map((s, idx) => {
              const title =
                (s.location || "-") +
                " — " +
                (s["location type"] || s.location_type || "-");
              const vessel = s.vessel ? `Vessel: ${s.vessel}` : "";
              const cont = s.container ? ` | Container: ${s.container}` : "";
              const time = s["event time"] || s.event_time || "";
              const eventName = s["event name"] || s.event_name || "";

              return (
                <div className="gocomet-step-node" key={idx}>
                  <div className="gocomet-step-dot" />
                  <div className="gocomet-step-content">
                    <div className="gocomet-step-title">{title}</div>
                    <div className="gocomet-step-meta">
                      {eventName && `${eventName} · `} {time}
                      {(vessel || cont) && ` · ${vessel}${cont}`}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="gocomet-empty">
              Tidak ada data stepper untuk SI ini.
            </div>
          )}
        </div>
      </div>

      {/* EVENT LIST */}
      <div className="gocomet-block">
        <div className="gocomet-block-title">Event Timeline</div>
        <div className="gocomet-events-wrapper">
          <table className="gocomet-events-table">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Event</th>
                <th style={{ width: "45%" }}>Port</th>
                <th style={{ width: "15%" }}>Event Type</th>
                <th style={{ width: "15%" }}>Event Time</th>
              </tr>
            </thead>
            <tbody>
              {eventList && eventList.length > 0 ? (
                eventList.map((e, idx) => (
                  <tr key={idx}>
                    <td>{e["event name"] || e.event_name || "-"}</td>
                    <td>  {(e["port name"] || e.port_name || "-").toString().toUpperCase()}</td>
                    <td>{e["location name"] || e.location_name || "-"}</td>
                    <td>{e["event time"] || e.event_time || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", fontSize: 11 }}>
                    Tidak ada data event untuk SI ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MESSAGE / ERROR */}
      {(message || error) && (
        <div className="gocomet-message">
          {message && <span>{message}</span>}
          {error && <span>{error}</span>}
        </div>
      )}
    </div>
  </GclLayout>
  );
}

export default GocometTracking;
