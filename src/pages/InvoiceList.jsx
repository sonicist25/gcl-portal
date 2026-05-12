// src/pages/InvoiceList.jsx
import { useEffect, useState, useMemo } from "react";
import GclLayout from "../layouts/GclLayout";
import Swal from "sweetalert2";
import { FaInfoCircle, FaFileInvoiceDollar, FaFileAlt, FaTimes, FaSpinner, FaSearch, FaFilter } from "react-icons/fa";
import { apiFetch } from "../utils/authApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://gateway-cl.com";

/** Helper: format tanggal 20251205 → 05/12/2025 */
function formatYmdToDmy(val) {
  if (!val) return "-";
  const cleaned = String(val).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return val;
  const y = cleaned.slice(0, 4);
  const m = cleaned.slice(4, 6);
  const d = cleaned.slice(6, 8);
  return `${d}/${m}/${y}`;
}

/** Helper: badge status invoice */
function getInvoiceStatusMeta(rawStatus) {
  const s = (rawStatus || "").toLowerCase().trim();
  if (!s) return { label: "Unknown", className: "gcl-pill-status gcl-pill-status-none" };
  if (s === "paid") return { label: "Paid", className: "gcl-pill-status gcl-pill-status-completed" };
  if (s === "unpaid") return { label: "Unpaid", className: "gcl-pill-status gcl-pill-status-pending" };
  if (s === "partial" || s === "partially paid") return { label: "Partial", className: "gcl-pill-status gcl-pill-status-active" };
  return { label: rawStatus, className: "gcl-pill-status gcl-pill-status-none" };
}

/** MODAL DETAIL INVOICE */
function InvoiceDetailModal({ open, invoice, onClose }) {
  if (!open || !invoice) return null;
  const invoiceUrl = invoice.url || "";
  const fakturUrl = invoice.faktur_url || null;

  return (
    <div className="gcl-modal-backdrop">
      <div className="gcl-modal">
        <div className="gcl-modal-header">
          <div>
            <div className="gcl-modal-title">Invoice {invoice.invoice_number || "-"}</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Job No: {invoice.job_no || "-"} • HBL: {invoice.hbl || "-"}</div>
          </div>
          <button type="button" className="gcl-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="gcl-modal-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", marginBottom: "15px", padding: "16px 20px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <div style={{ flex: "1 1 min-content" }}>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#334155" }}>Dokumen Tagihan</h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Unduh invoice atau cetak faktur pajak.</p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="gcl-btn" onClick={() => window.open(invoiceUrl, "_blank")} disabled={!invoiceUrl} style={{ backgroundColor: invoiceUrl ? "#2563eb" : "#94a3b8", color: "#fff", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: invoiceUrl ? "pointer" : "not-allowed" }}>
                <FaFileInvoiceDollar /> Invoice PDF
              </button>
              {fakturUrl && (
                <button className="gcl-btn" onClick={() => window.open(fakturUrl, "_blank")} style={{ backgroundColor: "#10b981", color: "#fff", padding: "8px 16px", borderRadius: "6px", border: "none" }}>
                  <FaFileAlt /> Faktur Pajak
                </button>
              )}
            </div>
          </div>
          {invoiceUrl && (
            <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden", height: 360 }}>
              <iframe src={invoiceUrl} title="Invoice" style={{ width: "100%", height: "100%", border: "none" }} />
            </div>
          )}
        </div>
        <div className="gcl-modal-footer">
          <button className="gcl-btn gcl-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function InvoiceList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [fetchingDetailId, setFetchingDetailId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const responseData = await apiFetch("/invoice_api", { method: "GET" });
        if (!responseData.status) throw new Error("Gagal mengambil data.");
        setRows(Array.isArray(responseData.data?.data) ? responseData.data.data : []);
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    fetchInvoices();
  }, []);

  const uniqueTypes = useMemo(() => [...new Set(rows.map(r => r.type).filter(Boolean))], [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchStatus = filterStatus === "ALL" || (row.status || "").toLowerCase().includes(filterStatus.toLowerCase());
      const matchType = filterType === "ALL" || (row.type || "").toLowerCase() === filterType.toLowerCase();
      const s = searchTerm.toLowerCase();
      const matchSearch = !s || [row.invoice_number, row.job_no, row.hbl, row.destination].some(v => (v || "").toLowerCase().includes(s));
      return matchStatus && matchType && matchSearch;
    });
  }, [rows, filterStatus, filterType, searchTerm]);

  const handleOpenDetail = async (row) => {
    setFetchingDetailId(row.invoice_number);
    try {
      const url = `${API_BASE}/faktur_pajak?invoice_no=${encodeURIComponent(row.invoice_number)}&X-API-KEY=gateway-fms`;
      const res = await apiFetch(url, { method: "GET" });
      setSelectedInvoice({ ...row, faktur_url: res?.data?.file_url || null });
      setShowDetail(true);
    } catch (e) { setSelectedInvoice({ ...row, faktur_url: null }); setShowDetail(true);
    } finally { setFetchingDetailId(null); }
  };

  // Style untuk elemen filter agar transparan & "glassy"
  const transparentStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(203, 213, 225, 0.3)",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "14px",
    outline: "none",
    color: "inherit"
  };

  return (
    <GclLayout>
      <div className="gcl-page">
        <div className="gcl-page-header">
          <div className="gcl-page-header-main">
            <h1 className="gcl-page-title">Invoice & Tax Invoice</h1>
            <p className="gcl-page-subtitle">Daftar invoice dan faktur pajak pengiriman Anda.</p>
          </div>
        </div>

        <div className="gcl-card" style={{ marginTop: "20px", height: "calc(99vh - 80px)", display: "flex", flexDirection: "column" }}>
          
          {/* BAR SEARCH & FILTER (TRANSPARAN) */}
          <div style={{ padding: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 250px" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#ffffff" }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...transparentStyle, width: "100%", paddingLeft: "36px" }}
              />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={transparentStyle}>
              <option value="ALL">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          {/* AREA TABEL (KEMBALI KE ASLI Tanpa Background Putih Tambahan) */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {error && <div className="gcl-alert gcl-alert-error">{error}</div>}
            {!error && (
              <div className="gcl-table-wrapper" style={{ minHeight: "98%" }}>
                <table className="gcl-table gcl-table-striped gcl-table-hover" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Invoice No</th>
                      <th>Invoice Date</th>
                      <th>Job No</th>
                      <th>HBL</th>
                      <th>Destination</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th>Aging</th>
                      <th style={{ textAlign: "center" }}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(6)].map((_, i) => <tr key={i}><td colSpan={11}><div className="gcl-skeleton-box" style={{ height: "16px" }} /></td></tr>)
                    ) : filteredRows.length === 0 ? (
                      <tr><td colSpan={11} className="gcl-table-empty">Data tidak ditemukan.</td></tr>
                    ) : (
                      filteredRows.map((row, idx) => {
                        const meta = getInvoiceStatusMeta(row.status);
                        return (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="gcl-col-booking-no">{row.invoice_number}</td>
                            <td>{formatYmdToDmy(row.invoice_date)}</td>
                            <td>{row.job_no}</td>
                            <td>{row.hbl}</td>
                            <td>{row.destination}</td>
                            <td style={{ textAlign: "center" }}><span className={meta.className}>{meta.label}</span></td>
                            <td>{meta.label === "Paid" ? "-" : `${row.aging || 0} days`}</td>
                            <td style={{ textAlign: "center" }}>
                              <button className="gcl-btn gcl-btn-sm gcl-btn-outline" onClick={() => handleOpenDetail(row)} disabled={fetchingDetailId === row.invoice_number}>
                                {fetchingDetailId === row.invoice_number ? <FaSpinner className="fa-spin" /> : <><FaInfoCircle /> Detail</>}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <InvoiceDetailModal open={showDetail} invoice={selectedInvoice} onClose={() => setShowDetail(false)} />
    </GclLayout>
  );
}

export default InvoiceList;