import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom"; // IMPORT PENTING
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import GclLayout from "../layouts/GclLayout";
import "leaflet/dist/leaflet.css";
import "../styles/gocometTracking.css";

// --- KONFIGURASI ICON LEAFLET ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// --- HELPER FUNCTIONS ---

const cleanPortName = (rawName) => {
  if (!rawName || typeof rawName !== 'string') return "";
  let name = rawName.toUpperCase();
  
  // Hapus detail dalam kurung, misal: "(MY)", "(ID)"
  name = name.replace(/\(.*\)/g, ""); 
  
  // Hapus kata-kata teknis port/terminal
  name = name.replace(/WEST PORT|JITC|NPCT1|EAST PORT|NORTH PORT|SOUTH PORT|HIT|TERMINAL|ACT|COCCO|HONGKONG|BPTS|- ARRIVAL/gi, "");
  
  // Ambil kata pertama sebelum koma
  name = name.split(",")[0].trim();
  
  return name;
};

// Helper untuk membandingkan lokasi tanpa spasi (HAIPHONG vs HAI PHONG)
const isSameLocation = (loc1, loc2) => {
    const c1 = cleanPortName(loc1).replace(/\s+/g, ""); // Hapus semua spasi
    const c2 = cleanPortName(loc2).replace(/\s+/g, "");
    return c1.includes(c2) || c2.includes(c1);
};

const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    if (dateStr.trim() === "*") return Number.MAX_SAFE_INTEGER;

    // Support format: DD/MM/YYYY
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
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

// --- LOGIKA UTAMA: EVENT LIST AS MASTER ---
const generateUnifiedJourney = (data) => {
    // 1. Sumber Data Pendukung (Hanya untuk lookup Vessel)
    const rawStepper = (data.stepper || []).filter(step => step && typeof step === 'object');
    const routing = data.routing || [];
    
    // 2. SUMBER UTAMA: Event List
    const eventList = (data["event list"] || data.event_list || []).filter(e => e && typeof e === 'object');

    // 3. Mapping Event List menjadi Timeline
    let timeline = eventList.map(evt => {
        const portName = evt["port name"] || evt.port_name;
        if (!portName) return null;

        const evtType = (evt["location name"] || evt.location_name || "").toLowerCase();
        const evtTime = parseDate(evt["event time"] || evt.event_time);
        
        // Klasifikasi Icon
        const isDoc = evtType.includes("document") || evtType.includes("do") || evtType.includes("stripping") || (evt["event name"]||"").toLowerCase().includes("stripping");
        const isTruck = evtType.includes("collection") || evtType.includes("deliver") || evtType.includes("gate") || evtType.includes("unloading");
        
        // Base Object
        const stepObj = {
            no: evt.no,
            location: portName,
            "location type": evt["location name"] || evt.location_name, 
            "event name": evt["event name"] || evt.event_name,
            "event time": evt["event time"] || evt.event_time,
            is_injected: false, // Karena ini data asli
            is_document: isDoc,
            is_truck: isTruck,
            vessel: "",
            container: ""
        };

        // --- ENRICHMENT: CARI INFO KAPAL ---
        // Jika ini bukan event truck/dokumen, coba cari kapal
        if (!isTruck && !isDoc) {
            
            // A. Coba cari di 'stepper' (Fuzzy Match Lokasi & Waktu/Tipe)
            const matchedStepper = rawStepper.find(s => {
                if (!isSameLocation(s.location, portName)) return false;
                
                // Cek Tipe (Departure vs Departure)
                const sType = (s["location type"] || "").toLowerCase();
                if (sType.includes(evtType) || evtType.includes(sType)) return true;

                // Cek Waktu (Toleransi 24 jam karena kadang beda timezone)
                const sTime = parseDate(s["event time"]);
                if (Math.abs(sTime - evtTime) < 86400000 && sTime !== 0 && evtTime !== Number.MAX_SAFE_INTEGER) return true;

                return false;
            });

            if (matchedStepper) {
                stepObj.vessel = matchedStepper.vessel;
                stepObj.container = matchedStepper.container;
            } 
            
            // B. Jika masih kosong, cari di 'routing' (Fallback)
            if (!stepObj.vessel) {
                 const loc = cleanPortName(portName).toUpperCase();
                 const matchedRoute = routing.find(r => {
                    if (!r) return false;
                    const pol = cleanPortName(r["port of loading"] || r.port_of_loading).toUpperCase();
                    const pod = cleanPortName(r["port of discharge"] || r.port_of_discharge).toUpperCase();
                    
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
    }).filter(Boolean); // Hapus yang null

    // 4. Sorting Final (Prioritas 'no')
    timeline.sort((a, b) => {
        if (a.no !== undefined && b.no !== undefined) return a.no - b.no;
        return parseDate(a["event time"]) - parseDate(b["event time"]);
    });

    return timeline;
};

function ChangeView({ center }) {
  const map = useMap();
  if (center) map.setView(center, 4);
  return null;
}

function GocometTracking({ defaultSiNumber = "" }) {
  // 1. GUNAKAN useSearchParams (Cara React Router)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSi = searchParams.get("si_number");

  // 2. Initial State langsung ambil dari URL jika ada
  // Jika urlSi ada, gunakan itu. Jika tidak, gunakan default.
  const [inputSi, setInputSi] = useState(urlSi || defaultSiNumber);
  const [activeSi, setActiveSi] = useState(urlSi || ""); 

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({});
  const [journey, setJourney] = useState([]); 

  // Effect untuk menangani jika URL berubah manual saat user sudah di halaman ini
  useEffect(() => {
    if (urlSi && urlSi !== activeSi) {
        setInputSi(urlSi);
        setActiveSi(urlSi);
    } else if (!urlSi && !activeSi && defaultSiNumber) {
        // Hanya set default jika URL kosong DAN activeSi kosong
        // setInputSi(defaultSiNumber); // Opsional: jangan paksa ubah input jika user sedang ngetik
    }
  }, [urlSi, defaultSiNumber]); 

  // FETCH DATA
  useEffect(() => {
    if (!activeSi) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://gateway-cl.com/api/track_gocomet?X-API-KEY=gateway-fms&si_number=${encodeURIComponent(activeSi)}`);
        const json = await res.json();
        setData(json);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    loadData();
  }, [activeSi]);

  // PROCESS DATA
  useEffect(() => {
    if (!data || typeof data !== 'object') return;

    const processed = generateUnifiedJourney(data);
    setJourney(processed);

    const fetchCoords = async () => {
      const eventList = data["event list"] || data.event_list || [];
      const newCoords = { ...coords };
      
      const validPorts = eventList
        .map(e => e ? (e["port name"] || e.port_name) : null)
        .filter(name => name && typeof name === 'string');

      const uniquePorts = [...new Set(validPorts)];

      for (const rawPort of uniquePorts) {
        const cleanedName = cleanPortName(rawPort);
        if (!cleanedName) continue;

        if (!newCoords[cleanedName]) {
            const fallbackMap = {
                "JAKARTA": [-6.104, 106.883], "HONG KONG": [22.319, 114.169],
                "MANZANILLO": [19.052, -104.316], "SHANGHAI": [31.230, 121.473], 
                "SINGAPORE": [1.290, 103.851], "HO CHI MINH": [10.762, 106.660],
                "HOCHIMINH": [10.762, 106.660], "CAT LAI": [10.762, 106.772],
                "QINGDAO": [36.067, 120.382]
            };
            const upper = cleanedName.toUpperCase();
            let foundKey = Object.keys(fallbackMap).find(k => upper.includes(k));
            
            if (foundKey) {
                newCoords[cleanedName] = fallbackMap[foundKey];
            } else {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedName)}&limit=1`);
                    const geo = await res.json();
                    if (geo && geo.length > 0) newCoords[cleanedName] = [parseFloat(geo[0].lat), parseFloat(geo[0].lon)];
                } catch (e) {}
            }
        }
      }
      setCoords(newCoords);
    };
    fetchCoords();
  }, [data]);

  const routePath = useMemo(() => {
    if(!data) return [];
    const eventList = data["event list"] || data.event_list || [];
    return eventList
        .filter(e => e && (e["port name"] || e.port_name))
        .map(e => coords[cleanPortName(e["port name"] || e.port_name)])
        .filter(Boolean);
  }, [data, coords]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputSi.trim()) {
        setActiveSi(inputSi.trim());
        // Opsional: Update URL agar bisa di-bookmark
        setSearchParams({ si_number: inputSi.trim() });
    }
  };

  const headerObj = data?.header?.[0]?.[0] || data?.header?.[0] || null;

  return (
    <GclLayout>
      <div className="gocomet-dark-container">
        {/* TOP BAR: Search Input (Selalu Muncul) */}
        <div className="gocomet-top-bar">
             <h2 className="page-title">Shipment Tracking</h2>
             <form onSubmit={handleSubmit} className="search-inline">
                <input 
                  value={inputSi} 
                  onChange={e => setInputSi(e.target.value)} 
                  placeholder="Enter SI Number..." 
                  className="si-input" 
                />
                <button type="submit" disabled={loading}>
                  {loading ? "Searching..." : "Track"}
                </button>
             </form>
        </div>

        {/* LOGIC TAMPILAN KONTEN */}
        {loading ? (
           // TAMPILAN 1: LOADING STATE
           <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Fetching shipment data from satellite...</p>
           </div>
        ) : headerObj ? (
          // TAMPILAN 2: DATA DITEMUKAN (Dashboard Grid Original Anda)
          <div className="dashboard-grid animate-in fade-in zoom-in duration-300">
            <div className="header-panel">
                <div className="header-item">
                    <span className="lbl">Status</span>
                    <span className={`val-badge ${headerObj.status?.toLowerCase().includes('complet') ? 'succ' : 'warn'}`}>
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
                    <span className="lbl">Last Update</span>
                    <span className="val" style={{fontSize: '0.9rem'}}>
                        {headerObj["last update"] ? headerObj["last update"].split('T')[0] : "-"}
                    </span>
                </div>
                {headerObj.arrived && (
                    <div className="header-item full-width">
                         <span className="lbl">Latest Radar</span>
                         <span className="val-sm">{headerObj.arrived}</span>
                    </div>
                )}
            </div>

            <div className="map-panel">
              {routePath.length > 0 ? (
                <MapContainer
                  center={routePath[0]}
                  zoom={3}
                  className="leaflet-map-view"
                  minZoom={2}
                  maxZoom={18}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    noWrap={true}
                  />
                  <ChangeView center={routePath[0]} />
                  {routePath.map((pos, i) => (
                    <Marker key={i} position={pos}><Popup>Point {i+1}</Popup></Marker>
                  ))}
                  <Polyline positions={routePath} color="#38bdf8" weight={2} dashArray="5, 5" />
                </MapContainer>
              ) : (
                <div className="map-loading">Processing Map Coordinates...</div>
              )}
            </div>

            <div className="journey-panel">
                <h3 className="panel-title">Shipment Journey Flow</h3>
                <div className="timeline-wrapper">
                    {journey.length > 0 ? journey.map((step, idx) => (
                        <div key={idx} className="tl-item">
                            <div className="tl-left">
                                <div className={`tl-dot ${step["location type"]?.includes("Arrival") ? 'arr' : 'dep'}`}></div>
                                {idx !== journey.length -1 && <div className="tl-line"></div>}
                            </div>
                            <div className="tl-content">
                                <div className="tl-header">
                                    <span className="tl-loc">{cleanPortName(step.location)}</span>
                                    <span className={`tl-type ${step.is_injected ? 'injected' : ''}`}>
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
                                
                                {/* Block Document & Truck sama seperti kode asli Anda... */}
                                {(step.is_document || (step["location type"] || "").toLowerCase().includes("document")) && (
                                    <div className="tl-vessel doc-type">
                                        <span className="v-icon">📄</span>
                                        <div className="v-detail">
                                            <strong>Document Processing</strong>
                                            <span>{step["event name"]}</span>
                                        </div>
                                    </div>
                                )}

                                {(step.is_truck || (step["location type"] || "").toLowerCase().includes("deliver") || (step["location type"] || "").toLowerCase().includes("collection") || (step["location type"] || "").toLowerCase().includes("gate")) && (
                                    <div className="tl-vessel truck-type">
                                        <span className="v-icon">🚚</span>
                                        <div className="v-detail">
                                            <strong>Logistics / Trucking</strong>
                                            <span>{step["event name"]}</span>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="tl-time">
                                    {step["event time"] || step.event_time || ""}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{color: '#94a3b8', textAlign: 'center', padding: '20px'}}>
                            No detailed events available.
                        </div>
                    )}
                </div>
            </div>
          </div>
        ) : (
          // TAMPILAN 3: EMPTY STATE / PLACEHOLDER (New!)
          <div className="empty-state-container">
             {/* SVG Ilustrasi Kapal Container */}
             <svg className="empty-illustration" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="90" fill="#1E293B" stroke="#334155" strokeWidth="2" strokeDasharray="8 8"/>
                <path d="M40 120H160" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round"/>
                <path d="M50 140H150" stroke="#38BDF8" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M65 110L55 90H145L135 110H65Z" fill="#334155"/>
                <rect x="70" y="70" width="20" height="20" rx="2" fill="#38BDF8" fillOpacity="0.8"/>
                <rect x="95" y="60" width="20" height="30" rx="2" fill="#F59E0B" fillOpacity="0.8"/>
                <rect x="120" y="75" width="20" height="15" rx="2" fill="#10B981" fillOpacity="0.8"/>
                <path d="M100 40V60" stroke="#94A3B8" strokeWidth="2"/>
                <circle cx="100" cy="35" r="5" fill="#EF4444" className="animate-pulse"/>
             </svg>

             <h3 className="empty-title">Ready to Track</h3>
             <p className="empty-desc">
                Enter your **HBL Number** above to see real-time location, vessel details, and journey milestones.
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