import { useEffect, useState } from "react";
import { FaPlus, FaInfoCircle, FaTimes, FaSearch, FaSave, FaShip, FaMapMarkerAlt, FaFilePdf, FaPrint } from "react-icons/fa";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/authApi";

// --- THEME CONFIGURATION (DARK MODE) ---
const theme = {
  bg: "#0f172a", paper: "#1e293b", inputBg: "#334155", border: "#475569",
  textMain: "#f8fafc", textMuted: "#94a3b8", primary: "#3b82f6",
  success: "#10b981", danger: "#ef4444", warning: "#f59e0b"
};

// --- STYLING ---
const styles = {
  modalBackdrop: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContainer: { backgroundColor: theme.bg, color: theme.textMain, width: "95%", maxWidth: "1500px", height: "92vh", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${theme.border}` },
  modalHeader: { padding: "20px 30px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.paper },
  modalBody: { padding: "30px", overflowY: "auto", flex: 1, backgroundColor: theme.bg },
  modalFooter: { padding: "20px 30px", borderTop: `1px solid ${theme.border}`, backgroundColor: theme.paper, display: "flex", justifyContent: "flex-end", gap: "12px" },
  sectionCard: { backgroundColor: theme.paper, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)" },
  sectionTitle: { margin: "0 0 20px", color: theme.primary, fontSize: "1.1rem", fontWeight: "700", borderBottom: `1px solid ${theme.border}`, paddingBottom: "10px", display: "flex", alignItems: "center", gap: "8px" },
  inputLabel: { display: "block", fontSize: "0.85rem", fontWeight: "600", color: theme.textMuted, marginBottom: "8px" },
  inputField: { width: "100%", padding: "12px 16px", fontSize: "0.95rem", color: theme.textMain, backgroundColor: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: "8px", outline: "none" },
  readOnlyField: { backgroundColor: "#0f172a", color: theme.textMuted, cursor: "not-allowed", border: `1px dashed ${theme.border}` },
  grid3Column: { display: "grid", gridTemplateColumns: "repeat(3, minmax(350px, 1fr))", gap: "24px", alignItems: "start" },
  column: { display: "flex", flexDirection: "column", gap: "24px" },
  formGroup: { marginBottom: "16px" }
};

function NewBookingModal({ open, onClose, onSubmit, initialData }) {
  const [cityOptions, setCityOptions] = useState([]);
  const [etdOptions, setEtdOptions] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // --- STATE BARU UNTUK READONLY ---
  const [isReadOnly, setIsReadOnly] = useState(false); 

  const now = new Date();
  const defaultBookingNo = `GTW-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}${String(now.getSeconds()).padStart(2,"0")}`;


  // Default State
  const defaultForm = {
    schedule_id: "", // Field ID schedule untuk backend
    region_id: "", city_identifier: "", etd_jkt_search: "",
    TypeTransaction: "LCL", textMovementtype: "CFS/CFS", textPlan: "Consol",
    booking_number: defaultBookingNo,
    textfieldSI: "", cargoCategory: "GeneralCargo",
    shipper: "", textareaShipper: "", contactshipper: "", contactemail: "",
    consignee: "", textareaConsignee: "",
    notify: "", textareaNotify: "",
    textareamarkingNos: "", textareadesc: "", textQty: "", textPackaging: "",
    textweight: "", textnetto: "", textmeas: "", textareaDog: "", textareaMarking: "",
    route_type_text: "DIRECT", 
    txtETDJKT: "", txtETA: "", txtClosingDoc: "", txtClosingCar: "",
    dropdownPortLoading: "TANJUNG PRIOK", dropdownPortTrans: "", dropdownPortdestination: "",
    vessel: "", voyage: "",
    warehouse: "", // Akan terisi otomatis dari detail booking atau hasil search
    sales_name: "", do_number: "", wh_arrival: "",
    textfieldFreight: "PREPAID", textfieldIncoterm: "EXW", BLtype: "3 ORIGINAL",
    pickupDateTime: "",
    house_bl: "",
  };

  const [form, setForm] = useState(defaultForm);

  // Helper untuk dynamic style input
  const getInputStyle = () => isReadOnly ? { ...styles.inputField, ...styles.readOnlyField } : styles.inputField;

  // --- 1. FETCH DETAIL / POPULATE DATA ---
  useEffect(() => {
    const fetchDetail = async () => {
      if (open) {
        if (initialData) {
          
          // --- KASUS A: DARI SCHEDULE PAGE (Pre-fill Routing) ---
          if (initialData.isFromSchedule) {
             setIsReadOnly(false); // Pastikan editable
             const toDateTimeLocal = (dateStr) => {
                if(!dateStr || dateStr === "0000-00-00 00:00:00") return "";
                return dateStr.includes(" ") ? dateStr.replace(" ", "T").substring(0, 16) : `${dateStr}T17:00`;
             };

             setForm({
                ...defaultForm,
                schedule_id: initialData.id || "", // Ambil ID jika ada di initialData
                vessel: initialData.vessel || "",
                voyage: initialData.voyage || "",
                txtETDJKT: initialData.etd_jkt || "",
                txtETA: initialData.eta || "",
                dropdownPortLoading: initialData.origin_city || "TANJUNG PRIOK",
                dropdownPortdestination: initialData.destination_city || "",
                dropdownPortTrans: initialData.trans_city || "",
                txtClosingDoc: toDateTimeLocal(initialData.closing_date),
                txtClosingCar: toDateTimeLocal(initialData.closing_date),
                route_type_text: initialData.route_type || "DIRECT",
                warehouse: initialData.warehouse || "", 
                region_id: "Jakarta" 
             });
             return; 
          }

          // --- KASUS B: EDIT BOOKING EXISTING (Fetch API) ---
          setLoadingDetail(true);
          try {
            const code = initialData.booking_code || initialData.no_from_shipper;
            const hbl  = initialData.hbl;

            const json = await apiFetch(`/instant_booking?booking_code=${encodeURIComponent(code)}&hbl=${encodeURIComponent(hbl)}`, {
              method: "GET",
            });

            if (json.status && json.booking) {
              const b = json.booking;
              const d = json.detail;

              // --- LOGIKA PENGECEKAN READONLY DARI API ---
              if (json.editable === "readonly") {
                setIsReadOnly(true);
              } else {
                setIsReadOnly(false);
              }
              
              const toDateTimeLocal = (dateStr) => {
                  if(!dateStr || dateStr === "0000-00-00 00:00:00") return "";
                  return dateStr.replace(" ", "T").substring(0, 16);
              };

              setForm({
                 ...defaultForm,
                 schedule_id: b.schedule_id || "", 
                 booking_number: b.booking_code,
                 TypeTransaction: b.mode || "LCL", 
                 textMovementtype: b.movement_type,
                 textfieldIncoterm: b.incoterm,
                 textfieldFreight: b.freight,
                 BLtype: b.number_of_bl,
                 dropdownPortLoading: b.origin_city,
                 dropdownPortdestination: b.destination_city,
                 dropdownPortTrans: b.trans_city,
                 vessel: b.vessel,
                 voyage: b.voyage,
                 txtETDJKT: b.expect_etd,
                 txtETA: b.eta,
                 txtClosingDoc: toDateTimeLocal(b.closing_date),
                 txtClosingCar: toDateTimeLocal(b.closing_cargo),
                 textfieldSI: b.si_number,
                 house_bl: b.house_bl,
                 warehouse: b.warehouse || "",
                 shipper: d.shipper_name,
                 textareaShipper: d.shipper_address,
                 contactshipper: d.cp_name,
                 contactemail: d.cp_email,
                 consignee: d.consignee_name, 
                 textareaConsignee: d.consignee, 
                 notify: d.notify_name,
                 textareaNotify: d.notify, 
                 textQty: d.quantity,
                 textPackaging: d.package_type,
                 textweight: d.weight,
                 textnetto: d.netto,
                 textmeas: d.volume,
                 textareamarkingNos: d.marking, 
                 textareadesc: d.description_of_goods,
                 textareaDog: d.description_print, 
                 cargoCategory: d.cargo_type || "GeneralCargo",
                 region_id: b.region_id
              });
            }
          } catch (err) {
            console.error("Failed to fetch detail", err);
            Swal.fire("Error", "Gagal mengambil detail booking", "error");
          } finally {
            setLoadingDetail(false);
          }
        } else {
          // --- KASUS C: CREATE NEW (Blank) ---
          setIsReadOnly(false); // New booking selalu editable
          setForm(defaultForm);
        }
      }
    };

    fetchDetail();
  }, [open, initialData]);

  // --- 2. FETCH DROPDOWNS ---
  useEffect(() => {
    const fetchCities = async () => {
      if (!form.region_id) { setCityOptions([]); return; }
      try {
        const res = await fetch(`https://gateway-cl.com/api/schedule_city_dd/city_options?X-API-KEY=gateway-fms&region_id=${form.region_id}`);
        const textData = await res.text();
        if(!textData) return;
        const json = JSON.parse(textData);
        let result = json.data || (Array.isArray(json) ? json : Object.values(json));
        setCityOptions(result);
      } catch (error) {}
    };
    fetchCities();
  }, [form.region_id]);

  useEffect(() => {
    const fetchEtd = async () => {
        if (!form.region_id || !form.city_identifier) { setEtdOptions([]); return; }
        try {
          const url = `https://gateway-cl.com//api/schedule_city_dd/etd_options?X-API-KEY=gateway-fms&region_id=${form.region_id}&city_identifier=${encodeURIComponent(form.city_identifier)}`;
          const res = await fetch(url);
          const textData = await res.text();
          if(!textData) return;
          const json = JSON.parse(textData);
          let result = json.data || (Array.isArray(json) ? json : Object.values(json));
          setEtdOptions(result);
        } catch (error) {}
    };
    fetchEtd();
  }, [form.city_identifier]);

  // --- 3. AUTO-FILL SHIPPER ---
  useEffect(() => {
    const fetchProfile = async () => {
      const shouldFetch = open && (!initialData || initialData.isFromSchedule);
      if (!shouldFetch) return; 

      try {
        const token = localStorage.getItem("gcl_access_token"); 
        if (!token) return;
        const res = await fetch("https://gateway-cl.com/api/Customer_login/profile", {
          headers: { "Authorization": `Bearer ${token}`, "X-API-KEY": "gateway-fms" }
        });
        const json = await res.json();
        const data = json.data || json;
        if (data && data.shipper_detail) {
          const det = data.shipper_detail;
          setForm(prev => ({
            ...prev,
            shipper: det.shipper_name || "",
            textareaShipper: det.shipper_address || "",
            contactshipper: det.cp_name || "",
            contactemail: det.cp_email || ""
          }));
        }
      } catch (error) {}
    };
    fetchProfile();
  }, [open, initialData]);

  // --- HANDLERS ---
  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const applyScheduleToForm = (schedule, type) => {
    const closingDate = schedule.closing_date || schedule.stf_cls || "";
    
    // --- UPDATE STATE: Termasuk ID dan Warehouse ---
    setForm(prev => ({
        ...prev,
        schedule_id: schedule.id,         // Menangkap ID dari JSON (Direct maupun Via)
        warehouse: schedule.warehouse || "", // Menangkap Warehouse
        vessel: schedule.vessel + (schedule.voy_vessel ? " " + schedule.voy_vessel : ""),
        voyage: schedule.voyage || (schedule.connecting_vessel + " " + (schedule.voy_con||"")),
        txtETDJKT: schedule.etd || schedule.etd_jkt || "",
        txtETA: schedule.eta || "",
        dropdownPortdestination: schedule.destination_name || "",
        dropdownPortTrans: schedule.etd_city_con_name || (type === 'VIA' ? "SINGAPORE" : ""),
        txtClosingDoc: closingDate ? `${closingDate}T17:00` : "",
        txtClosingCar: closingDate ? `${closingDate}T23:59` : "",
        route_type_text: type
    }));
    
    Swal.fire({ icon: 'success', title: 'Schedule Applied', timer: 1000, showConfirmButton: false, background: theme.paper, color: theme.textMain });
  };

  const handleSearchSchedule = async (e) => {
    e.preventDefault();
    if(isReadOnly) return; // Cegah search kalau readonly

    setLoadingSearch(true);
    try {
        const url = `https://gateway-cl.com/api/schedule?X-API-KEY=gateway-fms&city=${encodeURIComponent(form.city_identifier)}&etd=${form.etd_jkt_search}`;
        const res = await fetch(url);
        const json = await res.json();
        
        let candidates = [];
        if (json.data) json.data.forEach(g => {
            // Logika ini sudah menangkap DIRECT dan VIA
            if(g.direct) g.direct.forEach(d => candidates.push({...d, _type: 'DIRECT'}));
            if(g.via) g.via.forEach(v => candidates.push({...v, _type: 'VIA'}));
        });
        
        if (candidates.length === 1) applyScheduleToForm(candidates[0], candidates[0]._type);
        else if (candidates.length > 1) {
             const inputOptions = {};
             // Menampilkan pilihan ke user
             candidates.forEach((c, i) => inputOptions[i] = `${c._type} - ${c.vessel} - ETD ${c.etd || c.etd_jkt}`);
             const { value: idx } = await Swal.fire({ 
                 title: 'Select Route', input: 'select', inputOptions, 
                 background: theme.paper, color: theme.textMain, confirmButtonColor: theme.primary,
                 didOpen: () => {
                     const input = Swal.getInput();
                     input.style.backgroundColor = theme.inputBg; input.style.color = theme.textMain;
                 }
             });
             if(idx) applyScheduleToForm(candidates[idx], candidates[idx]._type);
        } else {
             Swal.fire({icon:'error', title:'Not Found', background: theme.paper, color: theme.textMain});
        }
    } catch (err) { console.error(err); } 
    finally { setLoadingSearch(false); }
  };

  const handlePrintBC = async () => {
    const url = `https://gclid.cloud/api/cetak_bc?booking_code=${form.booking_number}&warehouse=${form.warehouse}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': 'gateway-fms' }
      });
      if (!response.ok) throw new Error("Invalid API key or request failed");
      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
    } catch (error) {
      console.error("Error fetching PDF:", error);
      alert("Gagal cetak BC: " + error.message);
    }
  };

  const handlePrintHBL = async () => {
    const url = `https://gclid.cloud/api/cetak_bl?spd=${form.booking_number}&code=1&cetak=TRUE`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': 'gateway-fms' }
      });
      if (!response.ok) throw new Error("Invalid API key or request failed");
      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
    } catch (error) {
      console.error("Error fetching HBL PDF:", error);
      alert("Gagal cetak HBL: " + error.message);
    }
  };

  if (!open) return null;

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalContainer}>
        {/* HEADER */}
        <div style={{ ...styles.modalHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: theme.textMain }}>
              {initialData && !initialData.isFromSchedule ? "Booking Details" : "Create New Booking"}
              {isReadOnly && <span style={{fontSize: "0.8rem", marginLeft: "10px", color: theme.warning, border: `1px solid ${theme.warning}`, padding: "2px 8px", borderRadius: "4px"}}>READ ONLY</span>}
            </h2>
            <p style={{ margin: "4px 0 0", color: theme.textMuted }}>
              {initialData && !initialData.isFromSchedule ? `View/Edit booking ${form.booking_number}` : "Fill in the details below to create a new shipment."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {initialData && !initialData.isFromSchedule && !loadingDetail && !isReadOnly &&(
              <>
                <button onClick={handlePrintBC} className="gcl-btn" style={{ backgroundColor: theme.success, color: "#fff", padding: "10px 16px", borderRadius: "8px", border: "none", cursor: 'pointer', display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaFilePdf /> Booking Confirmation
                </button>
                <button onClick={handlePrintHBL} className="gcl-btn" style={{ backgroundColor: theme.warning, color: "#fff", padding: "10px 16px", borderRadius: "8px", border: "none", cursor: 'pointer', display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaPrint /> Draft HBL
                </button>
              </>
            )}
            <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.5rem", color: theme.textMuted }}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={styles.modalBody}>
          {loadingDetail ? (
            <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:theme.textMuted, flexDirection:'column'}}>
                <div className="gcl-loader" style={{marginBottom:10}}></div> 
                <p>Fetching booking data...</p>
            </div>
          ) : (
            <>
                <div style={{...styles.sectionCard, borderLeft: `5px solid ${theme.primary}`, display: 'flex', gap: '30px', flexWrap: 'wrap'}}>
                    {/* Search Section */}
                    <div style={{ flex: '1 1 350px' }}>
                        <h4 style={styles.sectionTitle}><FaSearch /> Search Schedule (Update Route)</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
                            <div>
                                <label style={styles.inputLabel}>Region</label>
                                <select name="region_id" value={form.region_id} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                    <option value="">Select Region</option>
                                    <option value="Jakarta">Jakarta</option>
                                    <option value="Surabaya">Surabaya</option>
                                    <option value="Semarang">Semarang</option>
                                    <option value="Medan">Medan</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.inputLabel}>Destination</label>
                                <select name="city_identifier" value={form.city_identifier} onChange={handleChange} style={getInputStyle()} disabled={!form.region_id || isReadOnly}>
                                    <option value="">Select City</option>
                                    {cityOptions.map((city, i) => <option key={i} value={city}>{city}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={styles.inputLabel}>ETD</label>
                                <select name="etd_jkt_search" value={form.etd_jkt_search} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                    <option value="">Select ETD</option>
                                    {etdOptions.map((etd, i) => <option key={i} value={etd}>{etd}</option>)}
                                </select>
                            </div>
                            <button type="button" onClick={handleSearchSchedule} className="gcl-btn" style={{ height: "46px", padding: "0 24px", backgroundColor: isReadOnly ? theme.border : theme.primary, color: '#fff', border: 'none', borderRadius: '8px', cursor: isReadOnly ? 'not-allowed' : 'pointer' }} disabled={loadingSearch || isReadOnly}>
                                <FaSearch />
                            </button>
                        </div>
                    </div>

                    {/* Routing Details */}
                    <div style={{ flex: '2 1 600px', borderLeft: `1px solid ${theme.border}`, paddingLeft: '30px' }}>
                        <h4 style={styles.sectionTitle}><FaShip /> Routing & Schedule Details</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                             <div style={{ gridColumn: "span 2" }}>
                                <label style={styles.inputLabel}>Vessel / Voyage</label>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input name="vessel" value={form.vessel} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} placeholder="Vessel" />
                                    <input name="voyage" value={form.voyage} onChange={handleChange} style={{...getInputStyle(), width: "40%"}} readOnly={isReadOnly} placeholder="Voy" />
                                </div>
                            </div>
                            <div>
                                <label style={styles.inputLabel}>ETD Pol</label>
                                <input type="date" name="txtETDJKT" value={form.txtETDJKT} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} />
                            </div>
                            <div>
                                <label style={styles.inputLabel}>ETA Pod</label>
                                <input type="date" name="txtETA" value={form.txtETA} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} />
                            </div>
                            <div>
                                 <label style={styles.inputLabel}>Port of Loading</label>
                                 <input name="dropdownPortLoading" value={form.dropdownPortLoading} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} />
                            </div>
                            <div>
                                 <label style={styles.inputLabel}>Transhipment</label>
                                 <input name="dropdownPortTrans" value={form.dropdownPortTrans} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} />
                            </div>
                            <div>
                                 <label style={styles.inputLabel}>Destination</label>
                                 <input name="dropdownPortdestination" value={form.dropdownPortdestination} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} />
                            </div>
                             <div>
                                <label style={styles.inputLabel}>Closing Doc</label>
                                <input type="datetime-local" name="txtClosingDoc" value={form.txtClosingDoc} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FORM GRID */}
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} id="new-booking-form">
                    
                    {/* --- HIDDEN INPUTS AGAR TERKIRIM KE BACKEND --- */}
                    <input type="hidden" name="schedule_id" value={form.schedule_id || ""} />
                    <input type="hidden" name="warehouse" value={form.warehouse || ""} />
                    {/* ----------------------------------------------- */}

                    <div style={styles.grid3Column}>
                        {/* COL 1: GENERAL */}
                        <div style={styles.column}>
                            <div style={styles.sectionCard}>
                                <h4 style={styles.sectionTitle}><FaInfoCircle /> General Info</h4>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Booking Number</label>
                                    <input name="booking_number" value={form.booking_number} readOnly style={{ ...styles.inputField, ...styles.readOnlyField }} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Type / Movement</label>
                                    <div style={{display: 'flex', gap: '8px'}}>
                                        <select name="TypeTransaction" value={form.TypeTransaction} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                            <option value="LCL">LCL</option><option value="FCL">FCL</option>
                                        </select>
                                        <select name="textMovementtype" value={form.textMovementtype} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                            <option value="CFS/CFS">CFS/CFS</option><option value="CY/CY">CY/CY</option><option value="Port to Port">Port to Port</option>
                                        </select>
                                    </div>
                                </div>
                                {initialData && !initialData.isFromSchedule && !loadingDetail && (
                                    <div style={styles.formGroup}>
                                        <label style={styles.inputLabel}>HBL Number</label>
                                        <input name="house_bl" value={form.house_bl} onChange={handleChange} style={getInputStyle()} readOnly />
                                    </div>
                                )}
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>SI Number</label>
                                    <input name="textfieldSI" value={form.textfieldSI} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Terms & Freight</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                                        <select name="textfieldFreight" value={form.textfieldFreight} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                            <option value="PREPAID">PREPAID</option><option value="COLLECT">COLLECT</option>
                                        </select>
                                        <select name="textfieldIncoterm" value={form.textfieldIncoterm} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                            <option value="EXW">EXW</option><option value="FOB">FOB</option><option value="CIF">CIF</option><option value="CNF">CNF</option>
                                        </select>
                                        <select name="BLtype" value={form.BLtype} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                            <option value="3 ORIGINAL">3 ORG</option><option value="EXPRESS RELEASE">TELEX</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Cargo Category</label>
                                    <select name="cargoCategory" value={form.cargoCategory} onChange={handleChange} style={getInputStyle()} disabled={isReadOnly}>
                                    <option value="GeneralCargo">General Cargo</option>
                                    <option value="DangerousGoods">Dangerous Goods (DG)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* COL 2: PARTIES */}
                        <div style={styles.column}>
                             <div style={styles.sectionCard}>
                                <h4 style={styles.sectionTitle}><FaMapMarkerAlt /> Parties</h4>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Shipper</label>
                                    <input name="shipper" value={form.shipper} onChange={handleChange} style={{ ...getInputStyle(), marginBottom: 5 }} readOnly={isReadOnly} placeholder="Name" />
                                    <textarea name="textareaShipper" value={form.textareaShipper} onChange={handleChange} rows={5} style={getInputStyle()} readOnly={isReadOnly} placeholder="Address" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Consignee</label>
                                    <textarea name="textareaConsignee" value={form.textareaConsignee} onChange={handleChange} rows={5} style={getInputStyle()} readOnly={isReadOnly} placeholder="Name & Address" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Notify Party</label>
                                    <textarea name="textareaNotify" value={form.textareaNotify} onChange={handleChange} rows={2} style={getInputStyle()} readOnly={isReadOnly} placeholder="Name & Address" />
                                </div>
                             </div>
                        </div>

                        {/* COL 3: GOODS */}
                        <div style={styles.column}>
                             <div style={styles.sectionCard}>
                                <h4 style={styles.sectionTitle}><FaSave /> Goods Details</h4>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Marks & Numbers</label>
                                    <textarea name="textareamarkingNos" value={form.textareamarkingNos} onChange={handleChange} rows={2} style={getInputStyle()} readOnly={isReadOnly} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Description</label>
                                    <textarea name="textareadesc" value={form.textareadesc} onChange={handleChange} rows={3} style={getInputStyle()} readOnly={isReadOnly} />
                                </div>
                                <div style={{display:'flex', gap:10, marginBottom:16}}>
                                    <div style={{flex:1}}><label style={styles.inputLabel}>Qty</label><input name="textQty" value={form.textQty} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly}/></div>
                                    <div style={{flex:2}}><label style={styles.inputLabel}>Pkg</label><input name="textPackaging" value={form.textPackaging} onChange={handleChange} style={getInputStyle()} readOnly={isReadOnly}/></div>
                                </div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16}}>
                                     <div style={{flex:1}}><label style={styles.inputLabel}>Gross Weight</label><input name="textweight" value={form.textweight} onChange={handleChange} placeholder="GW" style={getInputStyle()} readOnly={isReadOnly} /></div>
                                     <div style={{flex:1}}><label style={styles.inputLabel}>Nett Weight</label><input name="textnetto" value={form.textnetto} onChange={handleChange} placeholder="NW" style={getInputStyle()} readOnly={isReadOnly} /></div>
                                     <div style={{flex:1}}><label style={styles.inputLabel}>Volume</label><input name="textmeas" value={form.textmeas} onChange={handleChange} placeholder="M3" style={getInputStyle()} readOnly={isReadOnly} /></div>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.inputLabel}>Commodity (HS Code)</label>
                                    <textarea name="textareaDog" value={form.textareaDog} onChange={handleChange} rows={1} style={getInputStyle()} readOnly={isReadOnly} />
                                </div>
                             </div>
                        </div>
                    </div>
                </form>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={styles.modalFooter}>
          <button type="button" onClick={onClose} className="gcl-btn" style={{ backgroundColor: "transparent", color: theme.textMuted, border: "none", cursor: 'pointer' }}>Close</button>
          
          {/* HANYA TAMPILKAN TOMBOL SAVE JIKA TIDAK READONLY */}
          {!isReadOnly && (
            <button type="submit" form="new-booking-form" className="gcl-btn" style={{ backgroundColor: theme.primary, color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: 'pointer', display: "flex", alignItems: "center", gap: "8px" }}>
                <FaSave /> {initialData && !initialData.isFromSchedule ? "Update Booking" : "Save Booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewBookingModal;