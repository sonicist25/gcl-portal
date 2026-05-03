import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import GclLayout from "../layouts/GclLayout";
import "leaflet/dist/leaflet.css";
import "../styles/gocometTracking.css";

// =========================
// LEAFLET DEFAULT ICON FIX
// =========================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// =========================
// CUSTOM ICONS
// =========================

const startTrackIcon = L.divIcon({
  className: "start-track-marker",
  html: `<div class="map-dot map-dot-blue"></div>`,
  iconSize: [14, 14],
  iconAnchor: [6, 6],
});

const polIcon = L.divIcon({
  className: "pol-track-marker",
  html: `<div class="map-dot map-dot-green"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const potIcon = L.divIcon({
  className: "pot-track-marker",
  html: `<div class="map-dot map-dot-purple"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const podIcon = L.divIcon({
  className: "pod-track-marker",
  html: `<div class="map-dot map-dot-yellow"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const currentCargoIcon = L.divIcon({
  className: "current-cargo-marker",
  html: `
    <div class="ship-marker-wrap">
      <span class="ship-pulse"></span>
      <img src="/ship.png" class="ship-marker-img" />
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -18],
});

// =========================
// HELPERS
// =========================
const cleanPortName = (rawName) => {
  if (!rawName || typeof rawName !== "string") return "";
  let name = rawName.toUpperCase();

  name = name.replace(/\(.*\)/g, "");
  name = name.replace(
    /WEST PORT|JITC|NPCT1|EAST PORT|NORTH PORT|SOUTH PORT|HIT|TERMINAL|ACT|COCCO|HONGKONG|BPTS|- ARRIVAL/gi,
    ""
  );

  name = name.split(",")[0].trim();
  return name;
};

const isSameLocation = (loc1, loc2) => {
  const c1 = cleanPortName(loc1).replace(/\s+/g, "");
  const c2 = cleanPortName(loc2).replace(/\s+/g, "");
  return c1.includes(c2) || c2.includes(c1);
};

const parseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return 0;
  if (dateStr.trim() === "*") return Number.MAX_SAFE_INTEGER;

  const match = dateStr.match(
    /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/
  );

  if (match) {
    const day = match[1];
    const month = match[2];
    const year = match[3];
    const hour = match[4] || "00";
    const min = match[5] || "00";
    const sec = match[6] || "00";
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).getTime();
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getTime();
  return 0;
};

const parsePointString = (value) => {
  if (!value || typeof value !== "string") return null;

  const parts = value.split(",").map((v) => Number(v.trim()));
  if (parts.length < 2) return null;

  const lat = parts[0];
  const lon = parts[1];

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lat, lon];
};

const formatDisplayDate = (value) => {
  if (!value) return "-";

  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return value;
};

const isValidCoord = (value) => {
  if (value === null || value === undefined || value === "") return false;

  const num = Number(value);
  return Number.isFinite(num);
};

const getAisCurrentPoint = (data) => {
  const ais = data?.ais_current;
  if (!ais) return null;

  if (isValidCoord(ais.lat) && isValidCoord(ais.lon)) {
    return [Number(ais.lat), Number(ais.lon)];
  }

  if (Array.isArray(ais.lat_lon) && ais.lat_lon.length >= 2) {
    const lat = ais.lat_lon[0];
    const lon = ais.lat_lon[1];

    if (isValidCoord(lat) && isValidCoord(lon)) {
      return [Number(lat), Number(lon)];
    }
  }

  return null;
};

const getAisHistoryPoints = (data) => {
  if (!data?.ais_history) return [];

  let source = [];

  if (Array.isArray(data.ais_history.tracks) && data.ais_history.tracks.length > 1) {
    source = data.ais_history.tracks;
  } else if (
    Array.isArray(data?.ais_history?.tracks) &&
    data.ais_history.tracks.length === 1 &&
    Array.isArray(data.ais_history.tracks[0]?.raw)
  ) {
    source = data.ais_history.tracks[0].raw;
  } else if (Array.isArray(data?.ais_history?.raw?.data?.points)) {
    source = data.ais_history.raw.data.points;
  } else if (Array.isArray(data?.ais_history?.raw?.points)) {
    source = data.ais_history.raw.points;
  }

  return source
    .map((item) => {
      const lat = Number(item?.lat ?? item?.latitude);
      const lon = Number(item?.lon ?? item?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return [lat, lon];
      }
      return null;
    })
    .filter(Boolean);
};

// =========================
// JOURNEY GENERATOR
// =========================
const generateUnifiedJourney = (data) => {
  const rawStepper = (data.stepper || []).filter(
    (step) => step && typeof step === "object"
  );
  const routing = data.routing || [];
  const eventList = (data["event list"] || data.event_list || []).filter(
    (e) => e && typeof e === "object"
  );

  let timeline = eventList
    .map((evt) => {
      const portName = evt["port name"] || evt.port_name;
      if (!portName) return null;

      const evtType = (
        evt["location name"] ||
        evt.location_name ||
        ""
      ).toLowerCase();

      const eventName = (
        evt["event name"] ||
        evt.event_name ||
        ""
      ).toLowerCase();

      const evtTime = parseDate(evt["event time"] || evt.event_time);

      const isDoc =
        evtType.includes("document") ||
        evtType.includes("do") ||
        evtType.includes("bl draft") ||
        evtType.includes("invoice") ||
        evtType.includes("booking confirmed") ||
        eventName.includes("document") ||
        eventName.includes("draft bl") ||
        eventName.includes("booking confirmed") ||
        eventName.includes("invoice");

      const isTruck =
        evtType.includes("deliver") ||
        evtType.includes("delivery") ||
        evtType.includes("moving") ||
        evtType.includes("gate") ||
        eventName.includes("truck") ||
        eventName.includes("moving") ||
        eventName.includes("delivery") ||
        eventName.includes("gate in") ||
        evtType.includes("empty") ||
        eventName.includes("gate out");

      const isWarehouse =
        evtType.includes("warehouse") ||
        evtType.includes("cfs") ||
        evtType.includes("stuffing") ||
        evtType.includes("unstuffing") ||
        evtType.includes("consolidation") ||
        evtType.includes("deconsolidation") ||
        evtType.includes("receiving") ||
        evtType.includes("storage") ||
        evtType.includes("cargo received") ||
        eventName.includes("warehouse") ||
        eventName.includes("cfs") ||
        eventName.includes("stuffing") ||
        eventName.includes("unstuffing") ||
        eventName.includes("consolidation") ||
        eventName.includes("deconsolidation") ||
        eventName.includes("receiving") ||
        eventName.includes("cargo received") ||
        eventName.includes("storage");

      const stepObj = {
        no: evt.no,
        location: portName,
        "location type": evt["location name"] || evt.location_name,
        "event name": evt["event name"] || evt.event_name,
        "event time": evt["event time"] || evt.event_time,
        is_injected: false,
        is_document: isDoc,
        is_truck: isTruck,
        is_warehouse: isWarehouse,
        vessel: "",
        container: "",
      };

      if (!isTruck && !isDoc && !isWarehouse) {
        const matchedStepper = rawStepper.find((s) => {
          if (!isSameLocation(s.location, portName)) return false;

          const sType = (s["location type"] || "").toLowerCase();
          if (sType.includes(evtType) || evtType.includes(sType)) return true;

          const sTime = parseDate(s["event time"]);
          if (
            Math.abs(sTime - evtTime) < 86400000 &&
            sTime !== 0 &&
            evtTime !== Number.MAX_SAFE_INTEGER
          ) {
            return true;
          }

          return false;
        });

        if (matchedStepper) {
          stepObj.vessel = matchedStepper.vessel;
          stepObj.container = matchedStepper.container;
        }

        if (!stepObj.vessel) {
          const loc = cleanPortName(portName).toUpperCase();
          const matchedRoute = routing.find((r) => {
            if (!r) return false;

            const pol = cleanPortName(
              r["port of loading"] || r.port_of_loading
            ).toUpperCase();
            const pod = cleanPortName(
              r["port of discharge"] || r.port_of_discharge
            ).toUpperCase();

            if (evtType.includes("departure")) return pol && loc && pol.includes(loc);
            if (evtType.includes("arrival")) return pod && loc && pod.includes(loc);
            return false;
          });

          if (matchedRoute) {
            stepObj.vessel = matchedRoute.vessel;
            stepObj.container = matchedRoute.container;
          }
        }
      }

      return stepObj;
    })
    .filter(Boolean);

  timeline.sort((a, b) => {
    if (a.no !== undefined && b.no !== undefined) return a.no - b.no;
    return parseDate(a["event time"]) - parseDate(b["event time"]);
  });

  return timeline;
};

// =========================
// MAP VIEW ADJUSTER
// =========================
function ChangeView({ center, zoom = 3, bounds = null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, bounds]);

  return null;
}

// =========================
// COMPONENT
// =========================
function GocometTracking({ defaultSiNumber = "" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSi = searchParams.get("si_number");

  const [inputSi, setInputSi] = useState(urlSi || defaultSiNumber);
  const [activeSi, setActiveSi] = useState(urlSi || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({});
  const [journey, setJourney] = useState([]);

  useEffect(() => {
    if (urlSi && urlSi !== activeSi) {
      setInputSi(urlSi);
      setActiveSi(urlSi);
    }
  }, [urlSi, activeSi]);

  useEffect(() => {
    if (!activeSi) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const API_BASE =
          import.meta.env.VITE_API_BASE_URL || "https://gateway-cl.com";

        const res = await fetch(
          `${API_BASE}/api/track_gocomet?X-API-KEY=gateway-fms&si_number=${encodeURIComponent(
            activeSi
          )}`
        );

        const json = await res.json();
        console.log("FULL JSON FROM BROWSER:", JSON.stringify(json, null, 2));
console.log("ROOT KEYS:", Object.keys(json || {}));
console.log("json.ais_current:", json?.ais_current);
console.log("json.ais_history:", json?.ais_history);
console.log("json.data?.ais_current:", json?.data?.ais_current);
console.log("json.data?.ais_history:", json?.data?.ais_history);
        setData(json);
      } catch (e) {
        console.error(e);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeSi]);

  useEffect(() => {
    if (!data || typeof data !== "object") return;

    const processed = generateUnifiedJourney(data);
    setJourney(processed);

    const fetchCoords = async () => {
      const eventList = data["event list"] || data.event_list || [];
      const newCoords = { ...coords };

      const validPorts = eventList
        .map((e) => (e ? e["port name"] || e.port_name : null))
        .filter((name) => name && typeof name === "string");

      const uniquePorts = [...new Set(validPorts)];

      for (const rawPort of uniquePorts) {
        const cleanedName = cleanPortName(rawPort);
        if (!cleanedName) continue;

        if (!newCoords[cleanedName]) {
          const fallbackMap = {
            JAKARTA: [-6.104, 106.883],
            "HONG KONG": [22.319, 114.169],
            MANZANILLO: [19.052, -104.316],
            SHANGHAI: [31.23, 121.473],
            SINGAPORE: [1.29, 103.851],
            "HO CHI MINH": [10.762, 106.66],
            HOCHIMINH: [10.762, 106.66],
            "CAT LAI": [10.762, 106.772],
            QINGDAO: [36.067, 120.382],
          };

          const upper = cleanedName.toUpperCase();
          const foundKey = Object.keys(fallbackMap).find((k) => upper.includes(k));

          if (foundKey) {
            newCoords[cleanedName] = fallbackMap[foundKey];
          } else {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                  cleanedName
                )}&limit=1`
              );
              const geo = await res.json();
              if (geo && geo.length > 0) {
                newCoords[cleanedName] = [
                  parseFloat(geo[0].lat),
                  parseFloat(geo[0].lon),
                ];
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }

      setCoords(newCoords);
    };

    fetchCoords();
  }, [data]);

const headerObj = data?.header?.[0]?.[0] || data?.header?.[0] || null;
const aisCurrentPoint = useMemo(() => getAisCurrentPoint(data), [data]);
const aisHistoryPath = useMemo(() => getAisHistoryPoints(data), [data]);
const polPoint = useMemo(() => parsePointString(headerObj?.pol_point), [headerObj]);
const podPoint = useMemo(() => parsePointString(headerObj?.pod_point), [headerObj]);
const potPoint = useMemo(() => parsePointString(headerObj?.pot_point), [headerObj]);


const latestAisPoint = useMemo(() => {
  if (aisCurrentPoint) return aisCurrentPoint;
  if (aisHistoryPath.length > 0) return aisHistoryPath[aisHistoryPath.length - 1];
  return null;
}, [aisCurrentPoint, aisHistoryPath]);

const expectedPath = useMemo(() => {
  if (!latestAisPoint) return [];

  const pts = [latestAisPoint];

  if (potPoint) pts.push(potPoint);
  if (podPoint) pts.push(podPoint);

  return pts.length > 1 ? pts : [];
}, [latestAisPoint, potPoint, podPoint]);


const fallbackMapPath = useMemo(() => {
  if (!data) return [];

  const eventList = data["event list"] || data.event_list || [];
  return eventList
    .filter((e) => e && (e["port name"] || e.port_name))
    .map((e) => coords[cleanPortName(e["port name"] || e.port_name)])
    .filter(Boolean);
}, [data, coords]);

const hasAisHistory = aisHistoryPath.length > 1;
const hasAisCurrent = !!aisCurrentPoint;

const mapMode = hasAisHistory
  ? "ais_history"
  : hasAisCurrent
  ? "ais_current"
  : fallbackMapPath.length > 0
  ? "fallback"
  : "empty";

const mapCenter = useMemo(() => {
  if (hasAisCurrent) return aisCurrentPoint;
  if (hasAisHistory) return aisHistoryPath[aisHistoryPath.length - 1];
  if (fallbackMapPath.length > 0) return fallbackMapPath[0];
  return [15, 95];
}, [hasAisCurrent, aisCurrentPoint, hasAisHistory, aisHistoryPath, fallbackMapPath]);

const mapBounds = useMemo(() => {
  const pts = [];

  if (hasAisHistory) pts.push(...aisHistoryPath);
  if (hasAisCurrent) pts.push(aisCurrentPoint);
  if (!hasAisHistory && !hasAisCurrent) pts.push(...fallbackMapPath);
  if (polPoint) pts.push(polPoint);
  if (potPoint) pts.push(potPoint);
  if (podPoint) pts.push(podPoint);

  return pts.filter(Boolean);
}, [hasAisHistory, aisHistoryPath, hasAisCurrent, aisCurrentPoint, fallbackMapPath, podPoint, potPoint, polPoint]);


  const handleSubmit = (e) => {
    e.preventDefault();
    const val = inputSi.trim();
    if (!val) return;
    setActiveSi(val);
    setSearchParams({ si_number: val });
  };

  return (
    <GclLayout>
      <div className="gocomet-dark-container">
        <style>{`
          .tracking-content-row {
            display: grid;
            grid-template-columns: minmax(0, 1.9fr) minmax(340px, 0.9fr);
            gap: 18px;
            align-items: stretch;
            margin-top: 18px;
          }

          .tracking-map-panel,
          .tracking-journey-panel {
            min-height: 620px;
            height: 620px;
            position: relative;
          }

          .tracking-leaflet-map {
            width: 100%;
            height: 100%;
            border-radius: 16px;
            overflow: hidden;
          }

          .tracking-journey-panel {
            display: flex;
            flex-direction: column;
          }

          .tracking-timeline-wrapper {
            flex: 1;
            overflow-y: auto;
            padding-right: 8px;
          }

          .tracking-map-legend {
            position: absolute;
            left: 14px;
            bottom: 14px;
            z-index: 500;
            background: rgba(15, 23, 42, 0.88);
            border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 12px;
            padding: 10px 12px;
            backdrop-filter: blur(8px);
            color: #e2e8f0;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .tracking-legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .tracking-legend-item img {
            width: 18px;
            height: 18px;
            object-fit: contain;
          }

          .tracking-legend-item .dot {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            display: inline-block;
            border: 2px solid white;
          }

          .tracking-legend-item .dot.blue {
            background: #2563eb;
          }

          .tracking-legend-item .dot.yellow {
            background: #facc15;
          }

          .tracking-legend-item .line.blue {
            width: 24px;
            height: 0;
            border-top: 3px solid #2563eb;
            display: inline-block;
          }

          @media (max-width: 1100px) {
            .tracking-content-row {
              grid-template-columns: 1fr;
            }

            .tracking-map-panel,
            .tracking-journey-panel {
              height: 520px;
            }
          }
        `}</style>

      <div className="gocomet-top-bar">
  <div className="gocomet-title-wrap">
    <h2 className="page-title">Shipment Tracking</h2>
    <p className="page-subtitle">Live tracking with arrival forecasts — concise, clear, and supply‑chain friendly.</p>
  </div>

  <form onSubmit={handleSubmit} className="search-inline" aria-label="Track shipment">
    <input
      value={inputSi}
      onChange={(e) => setInputSi(e.target.value)}
      placeholder="Enter HBL Number..."
      className="si-input"
    />
    <button type="submit" disabled={loading} className="si-button">
      {loading ? "Searching..." : "Track"}
    </button>
  </form>
</div>

        {loading ? (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Fetching shipment data from satellite...</p>
          </div>
        ) : headerObj ? (
          <div className="dashboard-grid animate-in fade-in zoom-in duration-300">
            <div className="header-panel">
              <div className="header-item">
                <span className="lbl">Status</span>
                <span
                  className={`val-badge ${
                    headerObj.status?.toLowerCase().includes("complet")
                      ? "succ"
                      : "warn"
                  }`}
                >
                  {headerObj.status || "-"}
                </span>
              </div>

              <div className="header-item">
                <span className="lbl">Container No</span>
                <span className="val">{headerObj["container no"] || "-"}</span>
              </div>

              <div className="header-item">
                <span className="lbl">Carrier</span>
                <span className="val">{headerObj.scac || "-"}</span>
              </div>

              <div className="header-item">
                <span className="lbl">Map Source</span>
                <span className="val">
                  {mapMode === "ais_history"
                    ? "AIS History"
                    : mapMode === "ais_current"
                    ? "AIS Current"
                    : mapMode === "fallback"
                    ? "Route Fallback"
                    : "-"}
                </span>
              </div>

              <div className="header-item">
                <span className="lbl">POD</span>
                <span className="val">{headerObj.pod || "-"}</span>
              </div>

              <div className="header-item">
                <span className="lbl">Last Update</span>
                <span className="val" style={{ fontSize: "0.9rem" }}>
                  {formatDisplayDate(headerObj["last update"])}
                </span>
              </div>

              {headerObj.arrived && (
                <div className="header-item full-width">
                  <span className="lbl">Latest Radar</span>
                  <span className="val-sm">{headerObj.arrived}</span>
                </div>
              )}
            </div>

            <div className="tracking-content-row">
              <div className="tracking-map-panel">
                {mapMode !== "empty" ? (
                  <>
                    <MapContainer
                      center={mapCenter}
                      zoom={3}
                      className="tracking-leaflet-map"
                      minZoom={2}
                      maxZoom={18}
                      maxBounds={[
                        [-85, -180],
                        [85, 180],
                      ]}
                      maxBoundsViscosity={1.0}
                      scrollWheelZoom
                      worldCopyJump={false}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        noWrap={true}
                        bounds={[
                          [-85, -180],
                          [85, 180],
                        ]}
                      />

                      <ChangeView center={mapCenter} zoom={3} bounds={mapBounds} />

                      {mapMode === "ais_history" && (
                        <>
                          <Polyline
                            positions={aisHistoryPath}
                            color="#2563eb"
                            weight={4}
                            opacity={0.95}
                          />

                          {aisHistoryPath.length > 0 && (
                            <Marker position={aisHistoryPath[0]} icon={startTrackIcon}>
                              <Popup>
                                <div>
                                  <strong>Start AIS Track</strong>
                                  <br />
                                  Vessel: {data?.ais_current?.current_vessel || "-"}
                                </div>
                              </Popup>
                            </Marker>
                          )}

                          {aisCurrentPoint && (
                            <Marker position={aisCurrentPoint} icon={currentCargoIcon}>
                              <Popup>
                                <div>
                                  <strong>Current Cargo Position</strong>
                                  <br />
                                  Vessel: {data?.ais_current?.current_vessel || "-"}
                                  <br />
                                  Speed: {data?.ais_current?.speed || "-"}
                                  <br />
                                  Updated:{" "}
                                  {formatDisplayDate(data?.ais_current?.last_updated)}
                                </div>
                              </Popup>
                            </Marker>
                          )}

                          {polPoint && (
                            <Marker position={polPoint} icon={polIcon}>
                              <Popup>
                                <div>
                                  <strong>POL</strong>
                                  <br />
                                  {headerObj?.pol || "-"}
                                </div>
                              </Popup>
                            </Marker>
                          )}

                          {podPoint && (
                            <Marker position={podPoint} icon={podIcon}>
                              <Popup>
                                <div>
                                  <strong>Final POD</strong>
                                  <br />
                                  {headerObj?.pod || "-"}
                                </div>
                              </Popup>
                            </Marker>
                          )}

                          {/* Actual AIS path */}
                            {aisHistoryPath.length > 1 && (
                              <Polyline
                                positions={aisHistoryPath}
                                color="#2563eb"
                                weight={4}
                                opacity={0.95}
                              />
                            )}

                            {/* Expected / ETA path */}
                            {expectedPath.length > 1 && (
                              <Polyline
                                positions={expectedPath}
                                color="#facc15"
                                weight={3}
                                opacity={0.85}
                                dashArray="8, 8"
                              />
                            )}
                        </>
                      )}

                      {mapMode === "ais_current" && (
                        <>
                          {aisCurrentPoint && (
                            <Marker position={aisCurrentPoint} icon={currentCargoIcon}>
                              <Popup>
                                <div>
                                  <strong>Current Cargo Position</strong>
                                  <br />
                                  Vessel: {data?.ais_current?.current_vessel || "-"}
                                  <br />
                                  Speed: {data?.ais_current?.speed || "-"}
                                  <br />
                                  Updated:{" "}
                                  {formatDisplayDate(data?.ais_current?.last_updated)}
                                </div>
                              </Popup>
                            </Marker>
                          )}

                          {polPoint && (
                            <Marker position={polPoint} icon={polIcon}>
                              <Popup>
                                <div>
                                  <strong>POL</strong>
                                  <br />
                                  {headerObj?.pol || "-"}
                                </div>
                              </Popup>
                            </Marker>
                          )}

                          {podPoint && (
                            <Marker position={podPoint} icon={podIcon}>
                              <Popup>
                                <div>
                                  <strong>Final POD</strong>
                                  <br />
                                  {headerObj?.pod || "-"}
                                </div>
                              </Popup>
                            </Marker>
                          )}
                        </>
                      )}

                      {mapMode === "fallback" && (
                        <>
                          {fallbackMapPath.map((pos, i) => (
                            <Marker key={`fallback-${i}`} position={pos}>
                              <Popup>Route Point {i + 1}</Popup>
                            </Marker>
                          ))}

                          {fallbackMapPath.length > 1 && (
                            <Polyline
                              positions={fallbackMapPath}
                              color="#38bdf8"
                              weight={3}
                              dashArray="5, 5"
                              opacity={0.85}
                            />
                          )}

                          {polPoint && (
                            <Marker position={polPoint} icon={polIcon}>
                              <Popup>
                                <strong>POL</strong>
                                <br />
                                {headerObj?.pol || "-"}
                              </Popup>
                            </Marker>
                          )}

                          {potPoint && (
                            <Marker position={potPoint} icon={potIcon}>
                              <Popup>
                                <strong>Transhipment Port</strong>
                                <br />
                                {headerObj?.pot || "-"}
                              </Popup>
                            </Marker>
                          )}

                          {podPoint && (
                            <Marker position={podPoint} icon={podIcon}>
                              <Popup>
                                <strong>Final POD</strong>
                                <br />
                                {headerObj?.pod || "-"}
                              </Popup>
                            </Marker>
                          )}

                          {latestAisPoint && (
                            <Marker position={latestAisPoint} icon={currentCargoIcon}>
                              <Popup>
                                <strong>Current Cargo Position</strong>
                                <br />
                                Vessel: {data?.ais_current?.current_vessel || "-"}
                                <br />
                                Speed: {data?.ais_current?.speed || "-"}
                                <br />
                                Updated: {formatDisplayDate(data?.ais_current?.last_updated)}
                              </Popup>
                            </Marker>
                          )}
                        </>
                      )}
                    </MapContainer>

                    <div className="tracking-map-legend">
                      <div className="tracking-legend-item">
                        <img src="/ship.png" alt="ship" />
                        <span>Current cargo position</span>
                      </div>
                      <div className="tracking-legend-item">
                        <span className="dot blue"></span>
                        <span>Origin</span>
                      </div>
                      <div className="tracking-legend-item">
                        <span className="dot yellow"></span>
                        <span>Destination</span>
                      </div>
                      <div className="tracking-legend-item">
                        <span className="line blue"></span>
                        <span>AIS vessel route</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="map-loading">Processing Map Coordinates...</div>
                )}
              </div>

              <div className="journey-panel tracking-journey-panel">
                <h3 className="panel-title">Shipment Journey Flow</h3>
                <div className="timeline-wrapper tracking-timeline-wrapper">
                  {journey.length > 0 ? (
                    journey.map((step, idx) => (
                      <div key={idx} className="tl-item">
                        <div className="tl-left">
                          <div
                            className={`tl-dot ${
                              step["location type"]?.includes("Arrival")
                                ? "arr"
                                : "dep"
                            }`}
                          ></div>
                          {idx !== journey.length - 1 && <div className="tl-line"></div>}
                        </div>

                        <div className="tl-content">
                          <div className="tl-header">
                            <span className="tl-loc">{cleanPortName(step.location)}</span>
                            <span
                              className={`tl-type ${step.is_injected ? "injected" : ""}`}
                            >
                              {step["location type"] || step.location_type || "-"}
                            </span>
                          </div>

                          {step.vessel && (
                            <div className="tl-vessel">
                              <span className="v-icon">🚢</span>
                              <div className="v-detail">
                                <strong>{step.vessel}</strong>
                                {step.container && <span> • {step.container}</span>}
                              </div>
                            </div>
                          )}

                          {step.is_document && (
                            <div className="tl-vessel doc-type">
                              <span className="v-icon">📄</span>
                              <div className="v-detail">
                                <strong>Document Processing</strong>
                                <span>{step["event name"]}</span>
                              </div>
                            </div>
                          )}

                          {step.is_truck && (
                            <div className="tl-vessel truck-type">
                              <span className="v-icon">🚚</span>
                              <div className="v-detail">
                                <strong>Logistics / Trucking</strong>
                                <span>{step["event name"]}</span>
                              </div>
                            </div>
                          )}

                          {step.is_warehouse && (
                            <div className="tl-vessel warehouse-type">
                              <span className="v-icon">🏬</span>
                              <div className="v-detail">
                                <strong>Warehouse Activity</strong>
                                <span>{step["event name"]}</span>
                              </div>
                            </div>
                          )}

                          <div className="tl-time">
                            {step["event time"] || step.event_time || ""}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        color: "#94a3b8",
                        textAlign: "center",
                        padding: "20px",
                      }}
                    >
                      No detailed events available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state-container">
            <svg
              className="empty-illustration"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="#1E293B"
                stroke="#334155"
                strokeWidth="2"
                strokeDasharray="8 8"
              />
              <path
                d="M40 120H160"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M50 140H150"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeOpacity="0.5"
                strokeLinecap="round"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M65 110L55 90H145L135 110H65Z"
                fill="#334155"
              />
              <rect
                x="70"
                y="70"
                width="20"
                height="20"
                rx="2"
                fill="#38BDF8"
                fillOpacity="0.8"
              />
              <rect
                x="95"
                y="60"
                width="20"
                height="30"
                rx="2"
                fill="#F59E0B"
                fillOpacity="0.8"
              />
              <rect
                x="120"
                y="75"
                width="20"
                height="15"
                rx="2"
                fill="#10B981"
                fillOpacity="0.8"
              />
              <path d="M100 40V60" stroke="#94A3B8" strokeWidth="2" />
              <circle
                cx="100"
                cy="35"
                r="5"
                fill="#EF4444"
                className="animate-pulse"
              />
            </svg>

            <h3 className="empty-title">Ready to Track</h3>
            <p className="empty-desc">
              Enter your HBL Number above to see real-time location, vessel
              details, and journey milestones.
            </p>

            <div className="feature-pills">
              <span className="pill">✨ Predictive Tracking</span>
              <span className="pill">🚢 Vessel Details</span>
              <span className="pill">📅 ATD / ATA Updates</span>
            </div>
          </div>
        )}
      </div>
    </GclLayout>
  );
}

export default GocometTracking;