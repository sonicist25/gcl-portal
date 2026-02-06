import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaInfoCircle, FaTimes, FaSearch, FaSave, FaShip, FaCalendarAlt, FaMapMarkerAlt } from "react-icons/fa";
import GclLayout from "../layouts/GclLayout";
import "../styles/new_booking.css";
import Swal from "sweetalert2";
import NewBookingModal from "./NewBookingModal";
import { apiFetch } from "../utils/authApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://gateway-cl.com";

// --- THEME CONFIGURATION (DARK MODE MODERN) ---
const theme = {
  bg: "#0f172a",         // Very dark blue/slate
  paper: "#1e293b",      // Card background
  inputBg: "#334155",    // Input background
  border: "#475569",     // Border color
  textMain: "#f8fafc",   // White text
  textMuted: "#94a3b8",  // Gray text
  primary: "#3b82f6",    // Blue action
  primaryHover: "#2563eb",
  danger: "#ef4444",
  success: "#10b981",
};

// --- STYLING CONSTANTS (DARK MODE) ---
const styles = {
  modalBackdrop: {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(5px)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: theme.bg,
    color: theme.textMain,
    width: "95%", maxWidth: "1500px", height: "92vh",
    borderRadius: "16px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    display: "flex", flexDirection: "column", overflow: "hidden",
    border: `1px solid ${theme.border}`,
  },
  modalHeader: {
    padding: "20px 30px",
    borderBottom: `1px solid ${theme.border}`,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    backgroundColor: theme.paper,
  },
  modalBody: {
    padding: "30px",
    overflowY: "auto",
    flex: 1,
    backgroundColor: theme.bg, // Dark background body
  },
  modalFooter: {
    padding: "20px 30px",
    borderTop: `1px solid ${theme.border}`,
    backgroundColor: theme.paper,
    display: "flex", justifyContent: "flex-end", gap: "12px",
  },
  sectionCard: {
    backgroundColor: theme.paper,
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
  },
  sectionTitle: {
    margin: "0 0 20px",
    color: theme.primary,
    fontSize: "1.1rem",
    fontWeight: "700",
    borderBottom: `1px solid ${theme.border}`,
    paddingBottom: "10px",
    display: "flex", alignItems: "center", gap: "8px"
  },
  inputLabel: {
    display: "block", fontSize: "0.85rem", fontWeight: "600",
    color: theme.textMuted, marginBottom: "8px",
  },
  inputField: {
    width: "100%", padding: "12px 16px", fontSize: "0.95rem",
    color: theme.textMain,
    backgroundColor: theme.inputBg,
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    transition: "all 0.2s",
    outline: "none",
  },
  grid3Column: {
    display: "grid", gridTemplateColumns: "repeat(3, minmax(350px, 1fr))",
    gap: "24px", alignItems: "start",
  },
  column: {
    display: "flex", flexDirection: "column", gap: "24px",
  },
  formGroup: { marginBottom: "16px" },
  readOnlyField: {
    backgroundColor: "#1e293b", // Darker for readonly
    color: theme.textMuted,
    cursor: "not-allowed",
    border: `1px dashed ${theme.border}`
  }
};

function getTrackingStatusMeta(rawStatus) {
  const s = (rawStatus || "").trim();
  if (!s) {
    return {
      label: "Not Tracked",
      className: "gcl-pill-status gcl-pill-status-none",
    };
  }
  const u = s.toUpperCase();
  if (u === "ACTIVE")
    return {
      label: "Active",
      className: "gcl-pill-status gcl-pill-status-active",
    };
  if (u === "DELAYED" || u === "DELAY")
    return {
      label: "Delayed",
      className: "gcl-pill-status gcl-pill-status-delayed",
    };
  if (u === "PERFECT")
    return {
      label: "Perfect",
      className: "gcl-pill-status gcl-pill-status-perfect",
    };
  if (u === "PENDING")
    return {
      label: "Pending",
      className: "gcl-pill-status gcl-pill-status-pending",
    };
  if (u === "COMPLETED")
    return {
      label: "Completed",
      className: "gcl-pill-status gcl-pill-status-completed",
    };
  if (u === "EXPIRED")
    return {
      label: "Expired",
      className: "gcl-pill-status gcl-pill-status-expired",
    };
  if (u === "INVALID")
    return {
      label: "Invalid",
      className: "gcl-pill-status gcl-pill-status-invalid",
    };
  if (u === "DATA NOT FOUND")
    return {
      label: "Data Not Found",
      className: "gcl-pill-status gcl-pill-status-data-not-found",
    };
  if (u === "ACTION REQUIRED")
    return {
      label: "Action Required",
      className: "gcl-pill-status gcl-pill-status-action-required",
    };
  if (u === "PROBABLE DELAY")
    return {
      label: "Probable Delay",
      className: "gcl-pill-status gcl-pill-status-probable-delay",
    };
  if (u === "YET TO START")
    return {
      label: "Yet to Start",
      className: "gcl-pill-status gcl-pill-status-yet",
    };
  return { label: s, className: "gcl-pill-status gcl-pill-status-none" };
}

function BookingList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
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

  // taruh DI DALAM component BookingList(), tapi DI LUAR useEffect
const fetchBookings = async () => {
  try {
    setLoading(true);
    setError("");

    const json = await apiFetch("/booking_list");

    if (!json?.status) {
      throw new Error(json?.message || "Gagal mengambil data booking.");
    }

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


  // HANDLE CREATE NEW
  const handleNewBooking = () => {
    setSelectedBooking(null); // Pastikan null
    setShowNewBooking(true);
  };

  // HANDLE DETAIL (KLIK TOMBOL DETAIL DI TABLE)
  const handleDetail = (row) => {
    setSelectedBooking(row); // Set data row yang diklik
    setShowNewBooking(true);
  };

  // --- HANDLE SUBMIT KE API INSTANT BOOKING (UPDATED) ---
  const handleSubmitNewBooking = async (formData) => {
    // 1. Tampilkan Loading
    Swal.fire({
      title: 'Saving Booking...',
      text: 'Sending data to Gateway server',
      allowOutsideClick: false,
      background: '#1e293b', // Theme Paper
      color: '#f8fafc',      // Theme Text
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const token = localStorage.getItem("gcl_access_token");
      if (!token) throw new Error("Authentication token is missing. Please login again.");

      // 2. Persiapkan Data (Convert Object to URLSearchParams)
      // Format ini paling aman untuk dibaca oleh $this->post() di CodeIgniter
      const payload = new URLSearchParams();
      
      Object.keys(formData).forEach(key => {
        // Pastikan tidak ada nilai null/undefined
        const val = formData[key] === null || formData[key] === undefined ? "" : formData[key];
        payload.append(key, val);
      });

      // Tambahan: Masukkan nama user login jika diperlukan backend (user_first_name)
      // Ambil dari localStorage atau JWT profile Anda
      const userName = localStorage.getItem("username") || "User App"; 
      payload.append("user_first_name", userName);
      // Backend butuh origin_country? Jika tidak ada di form, kita bisa default
      if (!formData.origin_country) payload.append("origin_country", "INDONESIA");

      // 3. Hit API
     const json = await apiFetch("/instant_booking", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
      });

      // backend kamu: sukses biasanya { error:false, status:201 }
      if (json?.error || (json?.status && Number(json.status) !== 201)) {
        throw new Error(json?.message || "Failed to save booking (Backend Error).");
      }

      // 5. Sukses
      await Swal.fire({
        icon: 'success',
        title: 'Booking Created!',
        text: json.message || 'Your booking has been successfully saved.',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#3b82f6'
      });

      // Tutup modal & Refresh table
      setShowNewBooking(false);
      await fetchBookings();

    } catch (error) {
      console.error("Submit Error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error.message || 'Something went wrong.',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#ef4444'
      });
    }
  };
  return (
    <GclLayout>
      <div className="gcl-page">
        {/* HEADER PAGE */}
        <div
          className="gcl-page-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="gcl-page-header-main">
            <h1 className="gcl-page-title">Booking List</h1>
            <p className="gcl-page-subtitle">
              Daftar booking dan pengiriman terbaru Anda
            </p>
          </div>
          <div
            className="gcl-page-header-actions"
            style={{ paddingRight: "16px", paddingTop: "20px" }}
          >
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
          className="gcl-card"
          style={{
            marginTop: "20px",
            height: "calc(100vh - 160px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading && <div className="gcl-loading">Loading booking…</div>}
            {error && <div className="gcl-alert gcl-alert-error">{error}</div>}

            {!loading && !error && (
              <div
                className="gcl-table-wrapper"
                style={{ minHeight: "98%", overflow: "auto" }}
              >
                <table
                  className="gcl-table gcl-table-striped gcl-table-hover"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Booking No</th>
                      <th>BL No</th>
                      <th>Meass</th>
                      <th>ETD JKT</th>
                      <th>ETA</th>
                      <th>Feeder Vessel</th>
                      <th>Route</th>
                      <th style={{ textAlign: "center" }}>Tracking</th>
                      <th style={{ textAlign: "center" }}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="gcl-table-empty">
                          Tidak ada data booking.
                        </td>
                      </tr>
                    )}
                    {rows.map((row, idx) => {
                      const trackingMeta = getTrackingStatusMeta(
                        row.status_gocomet
                      );
                      return (
                        <tr key={`${row.no_from_shipper || "row"}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td className="gcl-col-booking-no">
                            {row.no_from_shipper || "-"}
                          </td>
                          <td className="gcl-col-booking-no">
                            {row.hbl || "-"}
                          </td>
                          <td className="gcl-col-booking-no">
                            {row.measurement || "-"}
                          </td>
                          <td>{formatDate(row.etd_jkt)}</td>
                          <td>{formatDate(row.eta)}</td>
                          <td className="gcl-col-booking-no">
                            {row.feeder_vessel || "-"}
                          </td>
                          <td className="gcl-col-booking-no">
                            {row.origin && row.destination
                              ? `${row.origin} - ${row.destination}`
                              : "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                              {/* UPDATE: LINK KE TRACKING */}
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
                          <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="gcl-btn gcl-btn-sm gcl-btn-outline"
                                onClick={() => handleDetail(row)} // PANGGIL handleDetail
                                style={{ display: "flex", alignItems: "center", gap: "4px" }}
                              >
                                <FaInfoCircle /> Detail
                              </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* MODAL NEW BOOKING */}
        <NewBookingModal
          open={showNewBooking}
          onClose={() => {
             setShowNewBooking(false);
             setSelectedBooking(null); // Reset saat close
          }}
          onSubmit={handleSubmitNewBooking}
          initialData={selectedBooking} // PASSING DATA
        />
      </div>
    </GclLayout>
  );
}

export default BookingList;