import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaInfoCircle, FaTimes, FaSearch, FaSave } from "react-icons/fa"; // Added icons for better UX
import GclLayout from "../layouts/GclLayout";
import "../styles/new_booking.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://gateway-cl.com";

// --- STYLING CONSTANTS (Untuk Modernisasi UI tanpa External CSS) ---
const styles = {
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "95%",
    maxWidth: "1400px", // Lebih lebar agar 3 kolom muat nyaman
    height: "90vh",
    borderRadius: "12px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "16px 24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  modalBody: {
    padding: "24px",
    overflowY: "auto",
    flex: 1,
    backgroundColor: "#f9fafb", // Background sedikit abu agar input putih stand-out
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  sectionCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  },
  inputLabel: {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "6px",
  },
  inputField: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "0.9rem",
    lineHeight: "1.25rem",
    color: "#1f2937",
    backgroundColor: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
    marginBottom: "4px", // Jaga jarak jika ada elemen bawahnya
  },
  grid3Column: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(300px, 1fr))", // Responsive min-width
    gap: "24px",
    alignItems: "start",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    marginBottom: "4px",
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

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("gcl_access_token");
        if (!token) throw new Error("Token tidak ditemukan, silakan login ulang.");

        const res = await fetch(`${API_BASE}/api/booking_list`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-KEY": "gateway-fms",
          },
        });

        const json = await res.json();
        if (!res.ok || !json.status)
          throw new Error(json.message || "Gagal mengambil data booking.");

        const bookings = Array.isArray(json.data?.bookings)
          ? json.data.bookings
          : [];
        const lastBookings = Array.isArray(json.data?.last_bookings)
          ? json.data.last_bookings
          : [];

        const combined = [
          ...bookings.map((b) => ({ ...b, _group: "Booking" })),
          ...lastBookings.map((b) => ({ ...b, _group: "Last Booking" })),
        ];
        setRows(combined);
      } catch (err) {
        console.error(err);
        setError(err.message || "Terjadi kesalahan tidak diketahui.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleNewBooking = () => {
    setShowNewBooking(true);
  };

  const handleDetail = (row) => {
    alert(
      `Detail booking:\nNo from shipper: ${
        row.no_from_shipper || "-"
      }\nDestination: ${row.destination || "-"}`
    );
  };

  const handleSubmitNewBooking = (formData) => {
    // NANTI: map ke payload API save_booking
    console.log("New booking submit:", formData);
    alert("Data booking siap dikirim ke API (sementara hanya console.log).");
    setShowNewBooking(false);
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
                            <span className={trackingMeta.className}>
                              {trackingMeta.label}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="gcl-btn gcl-btn-sm gcl-btn-outline"
                              onClick={() => handleDetail(row)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
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
          onClose={() => setShowNewBooking(false)}
          onSubmit={handleSubmitNewBooking}
        />
      </div>
    </GclLayout>
  );
}

/**
 * MODAL NEW BOOKING
 * UI Modern + Dynamic Dropdowns (City & ETD)
 */
function NewBookingModal({ open, onClose, onSubmit }) {
  const [cityOptions, setCityOptions] = useState([]);
  const [etdOptions, setEtdOptions] = useState([]);
  const now = new Date();
  const booking_number = `GTW-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;


  const [form, setForm] = useState({
    region_id: "",
    city_identifier: "",
    etd_jkt_search: "",
    TypeTransaction: "LCL",
    textMovementtype: "CFS/CFS",
    textPlan: "Consol",
    booking_number: booking_number,
    textfieldSI: "",
    shipper: "", textareaShipper: "", contactshipper: "", contactemail: "",
    consignee: "", textareaConsignee: "",
    notify: "", textareaNotify: "",
    textareamarkingNos: "", textareadesc: "", textQty: "", textPackaging: "",
    textweight: "", textnetto: "", textmeas: "", textareaDog: "", textareaMarking: "",
    route_type_text: "", txtETDJKT: "", txtETA: "", txtClosingDoc: "", txtClosingCar: "",
    dropdownPortLoading: "", dropdownPortTrans: "", dropdownPortdestination: "",
    vessel: "", voyage: "", warehouse: "", sales_name: "", do_number: "", wh_arrival: "",
    textfieldFreight: "PREPAID", textfieldIncoterm: "EXW", BLtype: "3 ORIGINAL",
  });

  // --- STYLING ---
  const styles = {
    modalBackdrop: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    modalContainer: { backgroundColor: "#fff", width: "95%", maxWidth: "1400px", height: "90vh", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", overflow: "hidden" },
    modalHeader: { padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff" },
    modalBody: { padding: "24px", overflowY: "auto", flex: 1, backgroundColor: "#f9fafb" },
    modalFooter: { padding: "16px 24px", borderTop: "1px solid #e5e7eb", backgroundColor: "#fff", display: "flex", justifyContent: "flex-end", gap: "12px" },
    sectionCard: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
    inputLabel: { display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "6px" },
    inputField: { width: "100%", padding: "10px 12px", fontSize: "0.9rem", color: "#1f2937", backgroundColor: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", marginBottom: "4px" },
    grid3Column: { display: "grid", gridTemplateColumns: "repeat(3, minmax(300px, 1fr))", gap: "24px", alignItems: "start" },
    column: { display: "flex", flexDirection: "column", gap: "16px" },
    formGroup: { marginBottom: "4px" }
  };

  // --- 1. FETCH CITY (UPDATED: Handle structure { status: true, data: [...] }) ---
  useEffect(() => {
    const fetchCities = async () => {
      if (!form.region_id) {
        setCityOptions([]);
        return;
      }
      try {
        const res = await fetch(`https://gateway-cl.com/api/schedule_city_dd/city_options?X-API-KEY=gateway-fms&region_id=${form.region_id}`);
        const textData = await res.text();
        
        if (!textData || textData.trim() === "") {
          setCityOptions([]);
          return;
        }

        const json = JSON.parse(textData);
        let result = [];

        // CASE 1: Struktur Baru ( { status: true, data: [...] } )
        if (json.data && Array.isArray(json.data)) {
          result = json.data;
        } 
        // CASE 2: Struktur Array Langsung (Legacy)
        else if (Array.isArray(json)) {
          result = json;
        } 
        // CASE 3: Object Values (Legacy jQuery logic)
        else if (typeof json === 'object' && json !== null) {
          result = Object.values(json);
        }

        setCityOptions(result);

      } catch (error) {
        console.error("Error fetching cities:", error);
        setCityOptions([]);
      }
    };

    fetchCities();
    setForm(prev => ({ ...prev, city_identifier: "", etd_jkt_search: "" }));
    setEtdOptions([]);
  }, [form.region_id]);

  // --- 2. FETCH ETD (UPDATED: Added similar check just in case) ---
  useEffect(() => {
    const fetchEtd = async () => {
      if (!form.region_id || !form.city_identifier) {
        setEtdOptions([]);
        return;
      }
      try {
        const url = `https://gateway-cl.com//api/schedule_city_dd/etd_options?X-API-KEY=gateway-fms&region_id=${form.region_id}&city_identifier=${encodeURIComponent(form.city_identifier)}`;
        const res = await fetch(url);
        const textData = await res.text();

        if (!textData || textData.trim() === "") {
            setEtdOptions([]);
            return;
        }

        const json = JSON.parse(textData);
        let result = [];

        // Cek struktur data (Prioritas ke json.data)
        if (json.data && Array.isArray(json.data)) {
            result = json.data;
        } else if (Array.isArray(json)) {
            result = json;
        } else if (typeof json === 'object' && json !== null) {
            result = Object.values(json);
        }

        setEtdOptions(result);

      } catch (error) {
        console.error("Error fetching ETD:", error);
        setEtdOptions([]);
      }
    };

    fetchEtd();
    setForm(prev => ({ ...prev, etd_jkt_search: "" }));
  }, [form.city_identifier, form.region_id]);

  if (!open) return null;

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleSearchSchedule = (e) => {
    e.preventDefault();
    // Logic search sesungguhnya bisa ditambahkan disini
    alert(`Search:\nRegion: ${form.region_id}\nCity: ${form.city_identifier}\nETD: ${form.etd_jkt_search}`);
  };

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalContainer}>
        {/* HEADER */}
        <div style={styles.modalHeader}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", margin: 0 }}>Create New Booking</h2>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "0.875rem" }}>Isi detail di bawah untuk membuat booking baru.</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#9ca3af" }}><FaTimes /></button>
        </div>

        {/* BODY */}
        <div style={styles.modalBody}>
          {/* SEARCH SECTION */}
          <div style={{ ...styles.sectionCard, borderLeft: "4px solid #3b82f6", backgroundColor: "#eff6ff" }}>
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaSearch style={{ color: "#3b82f6" }} />
              <strong style={{ color: "#1e40af" }}>Cari Schedule & Rate</strong>
            </div>
            
            <form onSubmit={handleSearchSchedule} style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={styles.inputLabel}>Region</label>
                <select name="region_id" value={form.region_id} onChange={handleChange} style={styles.inputField}>
                  <option value="">Select Region</option>
                  <option value="Jakarta">Jakarta</option>
                  <option value="Bandung">Bandung</option>
                  <option value="Surabaya">Surabaya</option>
                  <option value="Semarang">Semarang</option>
                  <option value="Medan">Medan</option>
                </select>
              </div>

              {/* DYNAMIC CITY DROPDOWN */}
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={styles.inputLabel}>City / Destination</label>
                <select 
                  name="city_identifier" 
                  value={form.city_identifier} 
                  onChange={handleChange} 
                  style={styles.inputField} 
                  disabled={!form.region_id || cityOptions.length === 0}
                >
                  <option value="">
                    {!form.region_id ? "Select Region first" : cityOptions.length === 0 ? "Loading..." : "Select City"}
                  </option>
                  {cityOptions.map((city, idx) => (
                    <option key={idx} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* DYNAMIC ETD DROPDOWN */}
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label style={styles.inputLabel}>ETD JKT</label>
                <select 
                  name="etd_jkt_search" 
                  value={form.etd_jkt_search} 
                  onChange={handleChange} 
                  style={styles.inputField} 
                  disabled={!form.city_identifier}
                >
                  <option value="">
                    {!form.city_identifier ? "Select City first" : etdOptions.length === 0 ? "No Schedule" : "Select ETD"}
                  </option>
                  {etdOptions.map((etd, idx) => (
                    <option key={idx} value={etd}>{etd}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="gcl-btn gcl-btn-primary" style={{ height: "42px", padding: "0 24px" }}>Search</button>
            </form>
          </div>

          {/* MAIN FORM */}
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} id="new-booking-form">
            <div style={styles.grid3Column}>
              {/* KOLUM 1 – TYPE, SHIPPER, CONSIGNEE */}
              <div style={styles.column}>
                {/* General Info Card */}
                <div style={styles.sectionCard}>
                  <h4 style={{ margin: "0 0 16px", color: "#111827", fontSize: "1rem", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>General Information</h4>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Type of Shipment</label>
                    <select
                      name="TypeTransaction"
                      value={form.TypeTransaction}
                      onChange={handleChange}
                      style={styles.inputField}
                    >
                      <option value="LCL">OCEAN LCL</option>
                      <option value="FCL">OCEAN FCL</option>
                      <option value="AIR">AIR FREIGHT</option>
                      <option value="TRUCKING">TRUCKING</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Movement Type</label>
                    <select
                      name="textMovementtype"
                      value={form.textMovementtype}
                      onChange={handleChange}
                      style={styles.inputField}
                    >
                      <option value="CFS/CFS">CFS/CFS</option>
                      <option value="CY/CY">CY/CY</option>
                      <option value="CY/CFS">CY/CFS</option>
                      <option value="CFS/CY">CFS/CY</option>
                      <option value="Port to Port">Port to Port</option>
                      <option value="Port to Door">Port to Door</option>
                      <option value="Door to Door">Door to Door</option>
                      <option value="Door to Port">Door to Port</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Stuffing Plan</label>
                    <select
                      name="textPlan"
                      value={form.textPlan}
                      onChange={handleChange}
                      style={styles.inputField}
                    >
                      <option value="Consol">Consol</option>
                      <option value="Coload">Coload</option>
                      <option value="FCL">FCL</option>
                      <option value="Air">Air</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Booking Number</label>
                    <input
                      name="booking_number"
                      value={form.booking_number}
                      readOnly
                      style={{ ...styles.inputField, backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>SI Number (From Shipper)</label>
                    <input
                      name="textfieldSI"
                      value={form.textfieldSI}
                      onChange={handleChange}
                      style={styles.inputField}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Shipper & Consignee Card */}
                <div style={styles.sectionCard}>
                   <h4 style={{ margin: "0 0 16px", color: "#111827", fontSize: "1rem", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Parties</h4>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Shipper</label>
                    <input
                      name="shipper"
                      value={form.shipper}
                      onChange={handleChange}
                      placeholder="Shipper Name"
                      style={{ ...styles.inputField, marginBottom: "8px" }}
                    />
                    <textarea
                      name="textareaShipper"
                      value={form.textareaShipper}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Full Address"
                      style={styles.inputField}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={styles.formGroup}>
                        <label style={styles.inputLabel}>PIC Name</label>
                        <input
                        name="contactshipper"
                        value={form.contactshipper}
                        onChange={handleChange}
                        style={styles.inputField}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.inputLabel}>Email(s)</label>
                        <input
                        name="contactemail"
                        value={form.contactemail}
                        onChange={handleChange}
                        placeholder="Comma separated"
                        style={styles.inputField}
                        />
                    </div>
                  </div>

                  <div style={{ ...styles.formGroup, marginTop: "12px" }}>
                    <label style={styles.inputLabel}>Consignee</label>
                    <input
                      name="consignee"
                      value={form.consignee}
                      onChange={handleChange}
                      placeholder="Consignee Name"
                      style={{ ...styles.inputField, marginBottom: "8px" }}
                    />
                    <textarea
                      name="textareaConsignee"
                      value={form.textareaConsignee}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Full Address"
                      style={styles.inputField}
                    />
                  </div>
                </div>
              </div>

              {/* KOLUM 2 – NOTIFY, GOODS, QTY/MEAS */}
              <div style={styles.column}>
                <div style={styles.sectionCard}>
                   <h4 style={{ margin: "0 0 16px", color: "#111827", fontSize: "1rem", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Goods Details</h4>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Notify Party</label>
                    <input
                      name="notify"
                      value={form.notify}
                      onChange={handleChange}
                      placeholder="Notify Name"
                      style={{ ...styles.inputField, marginBottom: "8px" }}
                    />
                    <textarea
                      name="textareaNotify"
                      value={form.textareaNotify}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Notify Address"
                      style={styles.inputField}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Marking & No</label>
                    <textarea
                      name="textareamarkingNos"
                      value={form.textareamarkingNos}
                      onChange={handleChange}
                      rows={2}
                      style={styles.inputField}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Description of Goods</label>
                    <textarea
                      name="textareadesc"
                      value={form.textareadesc}
                      onChange={handleChange}
                      rows={4}
                      style={styles.inputField}
                    />
                  </div>

                  <div
                    style={{ ...styles.formGroup, display: "flex", gap: "10px" }}
                  >
                    <div style={{ flex: 1 }}>
                      <label style={styles.inputLabel}>Quantity</label>
                      <input
                        name="textQty"
                        value={form.textQty}
                        onChange={handleChange}
                        style={styles.inputField}
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={styles.inputLabel}>Packaging</label>
                      <input
                        name="textPackaging"
                        value={form.textPackaging}
                        onChange={handleChange}
                        style={styles.inputField}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Weight (Kg) / Netto / Meas (M³)</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "8px",
                      }}
                    >
                      <input
                        name="textweight"
                        value={form.textweight}
                        onChange={handleChange}
                        placeholder="KGS"
                        style={styles.inputField}
                      />
                      <input
                        name="textnetto"
                        value={form.textnetto}
                        onChange={handleChange}
                        placeholder="Netto"
                        style={styles.inputField}
                      />
                      <input
                        name="textmeas"
                        value={form.textmeas}
                        onChange={handleChange}
                        placeholder="CBM"
                        style={styles.inputField}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Commodities</label>
                    <textarea
                      name="textareaDog"
                      value={form.textareaDog}
                      onChange={handleChange}
                      rows={2}
                      style={styles.inputField}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Additional Marking</label>
                    <textarea
                      name="textareaMarking"
                      value={form.textareaMarking}
                      onChange={handleChange}
                      rows={2}
                      style={styles.inputField}
                    />
                  </div>
                </div>
              </div>

              {/* KOLUM 3 – ROUTE, PORT, VESSEL, FREIGHT */}
              <div style={styles.column}>
                <div style={styles.sectionCard}>
                   <h4 style={{ margin: "0 0 16px", color: "#111827", fontSize: "1rem", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Routing & Schedule</h4>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Route Type</label>
                    <input
                      name="route_type_text"
                      value={form.route_type_text}
                      onChange={handleChange}
                      placeholder="Auto fill from schedule"
                      readOnly
                      style={{ ...styles.inputField, backgroundColor: "#f3f4f6" }}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>ETD / ETA</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="date"
                        name="txtETDJKT"
                        value={form.txtETDJKT}
                        onChange={handleChange}
                        style={styles.inputField}
                      />
                      <input
                        type="date"
                        name="txtETA"
                        value={form.txtETA}
                        onChange={handleChange}
                        style={styles.inputField}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Closing Doc / Stuffing</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="datetime-local"
                        name="txtClosingDoc"
                        value={form.txtClosingDoc}
                        onChange={handleChange}
                        style={styles.inputField}
                      />
                      <input
                        type="datetime-local"
                        name="txtClosingCar"
                        value={form.txtClosingCar}
                        onChange={handleChange}
                        style={styles.inputField}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Ports</label>
                    <select
                      name="dropdownPortLoading"
                      value={form.dropdownPortLoading}
                      onChange={handleChange}
                      style={{...styles.inputField, marginBottom: "8px"}}
                    >
                      <option value="">Select POL (Loading)</option>
                      <option value="TANJUNG PRIOK">TANJUNG PRIOK</option>
                      <option value="TANJUNG PERAK">TANJUNG PERAK</option>
                      <option value="TANJUNG EMAS">TANJUNG EMAS</option>
                      <option value="BELAWAN">BELAWAN</option>
                    </select>
                    <select
                      name="dropdownPortTrans"
                      value={form.dropdownPortTrans}
                      onChange={handleChange}
                      style={{...styles.inputField, marginBottom: "8px"}}
                    >
                      <option value="">Select POT (Transhipment)</option>
                      <option value="SINGAPORE">SINGAPORE</option>
                      <option value="HONG KONG">HONG KONG</option>
                      <option value="BUSAN (EX PUSAN)">BUSAN (EX PUSAN)</option>
                    </select>
                    <select
                      name="dropdownPortdestination"
                      value={form.dropdownPortdestination}
                      onChange={handleChange}
                      style={styles.inputField}
                    >
                      <option value="">Select POD (Destination)</option>
                      <option value="PORT KELANG">PORT KELANG</option>
                      <option value="LAEM CHABANG">LAEM CHABANG</option>
                      <option value="MANILA">MANILA</option>
                      <option value="SHANGHAI">SHANGHAI</option>
                      <option value="KEELUNG (CHILUNG)">KEELUNG (CHILUNG)</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Vessel / Voyage</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "8px",
                      }}
                    >
                      <input
                        name="vessel"
                        value={form.vessel}
                        onChange={handleChange}
                        placeholder="Feeder Vessel"
                        style={styles.inputField}
                      />
                      <input
                        name="voyage"
                        value={form.voyage}
                        onChange={handleChange}
                        placeholder="Connect Vessel"
                        style={styles.inputField}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Operations</label>
                     <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "8px",
                        marginBottom: "8px"
                      }}
                    >
                        <input
                            name="warehouse"
                            value={form.warehouse}
                            onChange={handleChange}
                            placeholder="Warehouse"
                            style={styles.inputField}
                        />
                        <input
                            name="sales_name"
                            value={form.sales_name}
                            onChange={handleChange}
                            placeholder="Sales Name"
                            style={styles.inputField}
                        />
                    </div>
                     <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "8px",
                      }}
                    >
                        <input
                            name="do_number"
                            value={form.do_number}
                            onChange={handleChange}
                            placeholder="DO Number"
                            style={styles.inputField}
                        />
                         <input
                            type="datetime-local"
                            name="wh_arrival"
                            value={form.wh_arrival}
                            onChange={handleChange}
                            style={styles.inputField}
                        />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.inputLabel}>Terms & Freight</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "8px",
                      }}
                    >
                      <select
                        name="textfieldFreight"
                        value={form.textfieldFreight}
                        onChange={handleChange}
                        style={styles.inputField}
                      >
                        <option value="PREPAID">PREPAID</option>
                        <option value="COLLECT">COLLECT</option>
                      </select>
                      <select
                        name="textfieldIncoterm"
                        value={form.textfieldIncoterm}
                        onChange={handleChange}
                        style={styles.inputField}
                      >
                        <option value="EXW">EXW</option>
                        <option value="FOB">FOB</option>
                        <option value="DDU">DDU</option>
                        <option value="DDP">DDP</option>
                        <option value="FCA">FCA</option>
                        <option value="CIF">CIF</option>
                        <option value="CNF">CNF</option>
                      </select>
                      <select
                        name="BLtype"
                        value={form.BLtype}
                        onChange={handleChange}
                        style={styles.inputField}
                      >
                        <option value="3 ORIGINAL">3 ORG</option>
                        <option value="EXPRESS RELEASE">TELEX</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <div style={styles.modalFooter}>
          <button
            type="button"
            className="gcl-btn gcl-btn-ghost"
            onClick={onClose}
            style={{ color: "#4b5563" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-booking-form"
            className="gcl-btn gcl-btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaSave /> Save Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingList;