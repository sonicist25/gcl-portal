import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaInfoCircle, FaSearch } from "react-icons/fa"; // Tambahkan FaSearch
import GclLayout from "../layouts/GclLayout";
import "../styles/new_booking.css";
import Swal from "sweetalert2";
import NewBookingModal from "./NewBookingModal";
import { apiFetch } from "../utils/authApi";
import { Truck, Box, Package, Plane, FileText, Shield } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://gateway-cl.com";

// --- THEME CONFIGURATION & STYLES (Dipertahankan seperti asli) ---
const theme = {
  bg: "#0f172a", paper: "#1e293b", inputBg: "#334155", border: "#475569",
  textMain: "#f8fafc", textMuted: "#94a3b8", primary: "#3b82f6",
  primaryHover: "#2563eb", danger: "#ef4444", success: "#10b981",
};

const styles = {
  // ... (Gaya inline untuk modal tetap dipertahankan sesuai aslinya)
  modalBackdrop: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContainer: { backgroundColor: theme.bg, color: theme.textMain, width: "95%", maxWidth: "1500px", height: "92vh", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${theme.border}` },
  modalHeader: { padding: "20px 30px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.paper },
  modalBody: { padding: "30px", overflowY: "auto", flex: 1, backgroundColor: theme.bg },
  modalFooter: { padding: "20px 30px", borderTop: `1px solid ${theme.border}`, backgroundColor: theme.paper, display: "flex", justifyContent: "flex-end", gap: "12px" },
  sectionCard: { backgroundColor: theme.paper, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)" },
  sectionTitle: { margin: "0 0 20px", color: theme.primary, fontSize: "1.1rem", fontWeight: "700", borderBottom: `1px solid ${theme.border}`, paddingBottom: "10px", display: "flex", alignItems: "center", gap: "8px" },
  inputLabel: { display: "block", fontSize: "0.85rem", fontWeight: "600", color: theme.textMuted, marginBottom: "8px" },
  inputField: { width: "100%", padding: "12px 16px", fontSize: "0.95rem", color: theme.textMain, backgroundColor: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: "8px", transition: "all 0.2s", outline: "none" },
  grid3Column: { display: "grid", gridTemplateColumns: "repeat(3, minmax(350px, 1fr))", gap: "24px", alignItems: "start" },
  column: { display: "flex", flexDirection: "column", gap: "24px" },
  formGroup: { marginBottom: "16px" },
  readOnlyField: { backgroundColor: "#1e293b", color: theme.textMuted, cursor: "not-allowed", border: `1px dashed ${theme.border}` }
};

async function ensureAuth() {
  const json = await apiFetch("/Customer_login/profile", { method: "GET" });
  if (json?.status === false) throw new Error(json?.message || "SESSION_INVALID");
  return true;
}

function normalizeServiceType(raw) {
  const s = (raw || "").toUpperCase();
  if (s.includes("TRUCKING")) return "INLAND";
  if (s === "COLOAD" || s === "LCL") return "LCL EXP";
  if (s === "COLOAD IMPORT" || s === "SF IMPORT LCL") return "LCL IMP";
  if (s === "FCL") return "FCL EXP";
  if (s === "SF IMPORT FCL") return "FCL IMP";
  if (s === "CUSTOM") return "CUSTOM EXP";
  if (s === "CUSTOM IMPORT") return "CUSTOM IMP";
  if (s === "AIR FREIGHT") return "AIR EXP";
  if (s === "AIR FREIGHT IMPORT") return "AIR IMP";
  if (s === "MESCELLENEOUS") return "OTHER";
  return s || "OTHER";
}

function getServiceIcon(type) {
  const s = normalizeServiceType(type);
  const style = { width: 18, height: 18, marginRight: 6 };

  switch (s) {
    case "INLAND":
      return <Truck style={style} />;
    case "LCL EXP":
    case "LCL IMP":
      return <Box style={style} />;
    case "FCL EXP":
    case "FCL IMP":
      return <Package style={style} />; // container cargo
    case "AIR EXP":
    case "AIR IMP":
      return <Plane style={style} />;
    case "CUSTOM EXP":
    case "CUSTOM IMP":
      return <Shield style={style} />; // officer/police style
    default:
      return <FileText style={style} />; // document for OTHER
  }
}


function getTrackingStatusMeta(rawStatus) {
  const s = (rawStatus || "").trim();
  if (!s) return { label: "Not Tracked Yet", className: "gcl-pill-status gcl-pill-status-none" };
  const u = s.toUpperCase();
  if (u === "ACTIVE") return { label: "Active", className: "gcl-pill-status gcl-pill-status-active" };
  if (u === "DELAYED" || u === "DELAY") return { label: "Delayed", className: "gcl-pill-status gcl-pill-status-delayed" };
  if (u === "PERFECT") return { label: "Perfect", className: "gcl-pill-status gcl-pill-status-perfect" };
  if (u === "PENDING") return { label: "Pending", className: "gcl-pill-status gcl-pill-status-pending" };
  if (u === "COMPLETED") return { label: "Completed", className: "gcl-pill-status gcl-pill-status-completed" };
  if (u === "EXPIRED") return { label: "Needs Update", className: "gcl-pill-status gcl-pill-status-expired" };
  if (u === "INVALID") return { label: "Correction Needed", className: "gcl-pill-status gcl-pill-status-invalid" };
  if (u === "DATA NOT FOUND") return { label: "On Progress", className: "gcl-pill-status gcl-pill-status-data-not-found" };
  if (u === "ACTION REQUIRED") return { label: "Awaiting Action", className: "gcl-pill-status gcl-pill-status-action-required" };
  if (u === "PROBABLE DELAY") return { label: "Probable Delay", className: "gcl-pill-status gcl-pill-status-probable-delay" };
  if (u === "YET TO START" || u === "NOT TRACKED") return { label: "On Progress", className: "gcl-pill-status gcl-pill-status-yet" };
  return { label: s, className: "gcl-pill-status gcl-pill-status-none" };
}

function BookingList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // --- 1. STATE UNTUK GLOBAL SEARCH ---
  const [searchTerm, setSearchTerm] = useState("");

  const formatDate = (val) => {
    if (!val) return "-";
    const cleaned = String(val).replace(/[^0-9]/g, "");
    if (cleaned.length === 8) {
      const y = cleaned.slice(0, 4);
      const m = cleaned.slice(4, 6);
      const d = cleaned.slice(6, 8);
      return `${d}/${m}/${y}`;
    }
    if (cleaned.length === 10 && val.includes("-")) {
      const [y, m, d] = val.split("-");
      return `${d}/${m}/${y}`;
    }
    return val;
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const json = await apiFetch("/booking_list");
      if (!json?.status) throw new Error(json?.message || "Gagal mengambil data booking.");

      const bookings = Array.isArray(json.data?.bookings) ? json.data.bookings : [];
      const lastBookings = Array.isArray(json.data?.last_bookings) ? json.data.last_bookings : [];

      const combined = [
        ...(bookings.length ? bookings.map((b) => ({ ...b, _group: "Booking" })) : []),
        ...(lastBookings.length ? lastBookings.map((b) => ({ ...b, _group: "Last Booking" })) : []),
      ];

      setRows(combined);
    } catch (err) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan tidak diketahui.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleNewBooking = async () => {
    try {
      await ensureAuth();
      setSelectedBooking(null);
      setShowNewBooking(true);
    } catch (err) {
      if (String(err?.message || "").includes("SESSION_EXPIRED")) return;
      Swal.fire("Session", err?.message || "Session expired, please login again.", "warning");
    }
  };

  const handleDetail = async (row) => {
    try {
      await ensureAuth();
      setSelectedBooking(row);
      setShowNewBooking(true);
    } catch (err) {
      if (String(err?.message || "").includes("SESSION_EXPIRED")) return;
      Swal.fire("Session", err?.message || "Session expired, please login again.", "warning");
    }
  };

  const handleSubmitNewBooking = async (formData) => {
    Swal.fire({
      title: 'Saving Booking...', text: 'Sending data to Gateway server', allowOutsideClick: false,
      background: '#1e293b', color: '#f8fafc', didOpen: () => Swal.showLoading()
    });

    try {
      const token = localStorage.getItem("gcl_access_token");
      if (!token) throw new Error("Authentication token is missing. Please login again.");

      const payload = new URLSearchParams();
      Object.keys(formData).forEach(key => {
        const val = formData[key] === null || formData[key] === undefined ? "" : formData[key];
        payload.append(key, val);
      });

      const userName = localStorage.getItem("username") || "User App"; 
      payload.append("user_first_name", userName);
      if (!formData.origin_country) payload.append("origin_country", "INDONESIA");

      const json = await apiFetch("/instant_booking", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: payload,
      });

      if (json?.error || (json?.status && Number(json.status) !== 201)) {
        throw new Error(json?.message || "Failed to save booking (Backend Error).");
      }

      await Swal.fire({
        icon: 'success', title: 'Booking Created!', text: json.message || 'Your booking has been successfully saved.',
        background: '#1e293b', color: '#f8fafc', confirmButtonColor: '#3b82f6'
      });

      setShowNewBooking(false);
      await fetchBookings();
    } catch (error) {
      console.error("Submit Error:", error);
      Swal.fire({
        icon: 'error', title: 'Submission Failed', text: error.message || 'Something went wrong.',
        background: '#1e293b', color: '#f8fafc', confirmButtonColor: '#ef4444'
      });
    }
  };

  // --- 2. LOGIC FILTER DATA BERDASARKAN GLOBAL SEARCH ---
  const filteredRows = rows.filter((row) => {
    const term = searchTerm.toLowerCase();
    return (
      (row.no_from_shipper || "").toLowerCase().includes(term) ||
      (row.hbl || "").toLowerCase().includes(term) ||
      (row.feeder_vessel || "").toLowerCase().includes(term) ||
      (row.origin || "").toLowerCase().includes(term) ||
      (row.destination || "").toLowerCase().includes(term)
    );
  });

 return (
    <GclLayout>
      {/* KUNCI 1: Halaman diset persis 100% tinggi layar */}
      <div 
        className="gcl-page" 
        style={{ padding: "24px 32px", boxSizing: "border-box", height: "100vh", overflow: "hidden" }}
      >
        
        {/* HEADER PAGE */}
        <div
          className="gcl-page-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}
        >
          <div className="gcl-page-header-main">
            <h1 className="gcl-page-title" style={{ margin: 0, fontSize: "1.8rem", color: "#fff" }}>Booking List</h1>
            <p className="gcl-page-subtitle" style={{ margin: "4px 0 0 0", color: "#94a3b8" }}>Daftar booking dan pengiriman terbaru Anda</p>
          </div>
          <div className="gcl-page-header-actions">
            <button
              type="button"
              className="gcl-btn gcl-btn-primary"
              onClick={handleNewBooking}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaPlus /> New Booking
            </button>
          </div>
        </div>

        {/* CARD LIST */}
        <div
          className="gcl-modern-card"
          style={{ 
            height: "calc(100vh - 130px)", /* KUNCI UTAMA: Paksa tinggi kotak menggunakan rumus matematika agar menyentuh bawah layar */
            display: "flex", 
            flexDirection: "column", 
            background: "rgba(30, 41, 59, 0.7)", 
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            overflow: "hidden"
          }}
        >
          
          {/* --- BAR GLOBAL SEARCH --- */}
          <div style={{ 
            padding: "16px", 
            borderBottom: "1px solid rgba(255,255,255,0.1)", 
            background: "rgba(15, 23, 42, 0.6)",
            flexShrink: 0 /* Cegah search bar menyusut */
          }}>
            <div style={{ position: "relative", maxWidth: "400px" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input 
                type="text" 
                placeholder="Search Booking No, BL, Vessel, Route..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: "100%", padding: "10px 10px 10px 36px", 
                  borderRadius: "6px", border: "1px solid #334155", 
                  background: "#0f172a", color: "#f8fafc", outline: "none", boxSizing: "border-box" 
                }}
              />
            </div>
          </div>

          {/* --- AREA TABEL --- */}
          {/* KUNCI 2: Flex 1 agar area scroll ini mengisi penuh sisa tinggi kotak (Card) */}
          <div style={{ flex: 1, overflow: "auto", background: "rgba(15, 23, 42, 0.3)" }}>
            {loading && <div className="gcl-loading" style={{ padding: "20px", color: "#fff" }}>Loading booking…</div>}
            {error && <div className="gcl-alert gcl-alert-error" style={{ padding: "20px" }}>{error}</div>}

            {!loading && !error && (
              <table className="gcl-table gcl-table-striped gcl-table-hover" style={{ width: "100%", minWidth: "1000px", borderCollapse: "collapse" }}>
                
                {/* KUNCI 3: Sticky header agar judul kolom tidak hilang saat di-scroll ke bawah */}
                <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#0f172a", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                  <tr>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>No</th>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Booking No</th>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>BL No</th>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Mode</th>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>ETD</th>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>ETA</th>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Vessel</th>
                    <th style={{ padding: "14px 16px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Route</th>
                    <th style={{ padding: "14px 16px", textAlign: "center", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Tracking</th>
                    <th style={{ padding: "14px 16px", textAlign: "center", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="gcl-table-empty" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        {searchTerm ? `Tidak ditemukan data untuk pencarian "${searchTerm}"` : "Tidak ada data booking."}
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((row, idx) => {
                    const trackingMeta = getTrackingStatusMeta(row.status_gocomet);
                    return (
                      <tr key={`${row.no_from_shipper || "row"}-${idx}`}>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{idx + 1}</td>
                        <td className="gcl-col-booking-no" style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: "600" }}>{row.no_from_shipper || "-"}</td>
                        <td className="gcl-col-booking-no" style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{row.hbl || "-"}</td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center" }}>
                            {getServiceIcon(row.type_of_trans)}
                            <span>{normalizeServiceType(row.type_of_trans) || "-"}</span>
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{formatDate(row.etd_jkt)}</td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{formatDate(row.eta)}</td>
                        <td className="gcl-col-booking-no" style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{row.feeder_vessel || "-"}</td>
                        <td className="gcl-col-booking-no" style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {row.origin && row.destination ? `${row.origin} - ${row.destination}` : "-"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            {row.hbl  ? (
                                <Link 
                                    to={`/tracking?si_number=${encodeURIComponent(row.hbl)}`}
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
                        <td style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <button
                              type="button"
                              className="gcl-btn gcl-btn-sm gcl-btn-outline"
                              onClick={() => handleDetail(row)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "transparent", color: "#94a3b8", border: "1px solid #475569", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                            >
                              <FaInfoCircle /> Detail
                            </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <NewBookingModal
          open={showNewBooking}
          onClose={() => {
             setShowNewBooking(false);
             setSelectedBooking(null);
          }}
          onSubmit={handleSubmitNewBooking}
          initialData={selectedBooking} 
        />
      </div>
    </GclLayout>
  );
}

export default BookingList;