// src/pages/InvoiceList.jsx
import { useEffect, useState } from "react";
import GclLayout from "../layouts/GclLayout";
import Swal from "sweetalert2";
import { FaInfoCircle, FaFileInvoiceDollar, FaFileAlt, FaTimes, FaSpinner } from "react-icons/fa";
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

/** Helper: badge status invoice (paid / unpaid / partial) */
function getInvoiceStatusMeta(rawStatus) {
  const s = (rawStatus || "").toLowerCase().trim();
  if (!s) {
    return {
      label: "Unknown",
      className: "gcl-pill-status gcl-pill-status-none",
    };
  }
  if (s === "paid") {
    return {
      label: "Paid",
      className: "gcl-pill-status gcl-pill-status-completed",
    };
  }
  if (s === "unpaid") {
    return {
      label: "Unpaid",
      className: "gcl-pill-status gcl-pill-status-pending",
    };
  }
  if (s === "partial" || s === "partially paid") {
    return {
      label: "Partial",
      className: "gcl-pill-status gcl-pill-status-active",
    };
  }
  return {
    label: rawStatus,
    className: "gcl-pill-status gcl-pill-status-none",
  };
}

/** MODAL DETAIL INVOICE + FAKTUR PAJAK */
function InvoiceDetailModal({ open, invoice, onClose }) {
  if (!open || !invoice) return null;

  const invoiceUrl = invoice.url || "";
  const fakturUrl = invoice.faktur_url || null; // URL faktur hasil cek dari API

  const handleOpenInvoice = () => {
    if (invoiceUrl) {
      window.open(invoiceUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenFaktur = () => {
    if (fakturUrl) {
      window.open(fakturUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="gcl-modal-backdrop">
      <div className="gcl-modal">
        {/* HEADER */}
        <div className="gcl-modal-header">
          <div>
            <div className="gcl-modal-title">
              Invoice {invoice.invoice_number || "-"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              Job No: {invoice.job_no || "-"} • HBL: {invoice.hbl || "-"}
            </div>
          </div>
          <button
            type="button"
            className="gcl-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* BODY */}
        <div className="gcl-modal-body">
          {/* ACTION BOX: Dokumen & Faktur */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
              marginBottom: "15px",
              padding: "16px 20px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          >
            <div style={{ flex: "1 1 min-content" }}>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#334155" }}>
                Dokumen Tagihan
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Unduh invoice utama atau cetak faktur pajak (e-Faktur) jika tersedia.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {/* TOMBOL 1: INVOICE UTAMA (Biru) */}
              <button
                type="button"
                className="gcl-btn"
                onClick={handleOpenInvoice}
                disabled={!invoiceUrl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: invoiceUrl ? "#2563eb" : "#94a3b8",
                  color: "#fff",
                  fontWeight: "600",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  boxShadow: invoiceUrl ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "none",
                  cursor: invoiceUrl ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <FaFileInvoiceDollar size={16} /> 
                 Invoice PDF
              </button>

              {/* TOMBOL 2: FAKTUR PAJAK (Hanya muncul jika fakturUrl ada) */}
              {fakturUrl && (
                <button
                  type="button"
                  className="gcl-btn"
                  onClick={handleOpenFaktur}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#10b981",
                    color: "#fff",
                    fontWeight: "600",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <FaFileAlt size={16} />
                  Faktur Pajak
                </button>
              )}
            </div>
          </div>

          {/* Preview iframe */}
          {invoiceUrl && (
            <div
              style={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                background: "#fff",
                height: 360,
              }}
            >
              <iframe
                src={invoiceUrl}
                title={`Invoice ${invoice.invoice_number}`}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="gcl-modal-footer">
          <button
            type="button"
            className="gcl-btn gcl-btn-ghost"
            onClick={onClose}
          >
            Close
          </button>
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
  
  // State untuk melacak row mana yang sedang proses cek faktur pajak
  const [fetchingDetailId, setFetchingDetailId] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError("");

        const responseData = await apiFetch("/invoice_api", {
          method: "GET"
        });

        if (!responseData.status) {
          throw new Error(
            responseData.message || responseData.data?.message || "Gagal mengambil data invoice."
          );
        }

        const list = Array.isArray(responseData.data?.data) ? responseData.data.data : [];
        setRows(list);

      } catch (err) {
        console.error(err);
        setError(err.message || "Terjadi kesalahan tidak diketahui.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Fungsi untuk membuka detail & mengecek faktur terlebih dahulu
  const handleOpenDetail = async (row) => {
    try {
      setFetchingDetailId(row.invoice_number); // Aktifkan spinner di tabel

      let fakturUrl = null;
      try {
        const invoiceNo = row.invoice_number || "";
        const url = `${API_BASE}/faktur_pajak?invoice_no=${encodeURIComponent(invoiceNo)}&X-API-KEY=gateway-fms`;

        const responseData = await apiFetch(url, { method: "GET" });

        // Jika berhasil dan file_url ada isinya
        if (responseData && responseData.status && responseData.data?.file_url) {
          fakturUrl = responseData.data.file_url;
        }
      } catch (err) {
        // Abaikan error di console, biarkan fakturUrl tetap null
        console.warn("Faktur pajak tidak ditemukan:", err);
      }

      // Masukkan data row dan url faktur pajak (jika ada) ke state
      setSelectedInvoice({ ...row, faktur_url: fakturUrl });
      setShowDetail(true);
    } finally {
      setFetchingDetailId(null); // Matikan spinner
    }
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedInvoice(null);
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
            <h1 className="gcl-page-title">Invoice & Tax Invoice</h1>
            <p className="gcl-page-subtitle">
              Daftar invoice dan faktur pajak untuk pengiriman Anda.
            </p>
          </div>
        </div>

        {/* LIST INVOICE */}
        <div
          className="gcl-card"
          style={{
            marginTop: "20px",
            height: "calc(99vh - 80px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading && <div className="gcl-loading">Loading invoice…</div>}

            {error && (
              <div className="gcl-alert gcl-alert-error">{error}</div>
            )}

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
                      <th>Invoice No</th>
                      <th>Invoice Date</th>
                      <th>Job No</th>
                      <th>HBL</th>
                      <th>Destination</th>
                      <th>Type</th>
                      <th>ATD</th>
                      <th>Status</th>
                      <th>Aging</th>
                      <th style={{ textAlign: "center" }}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="gcl-table-empty">
                          Tidak ada data invoice.
                        </td>
                      </tr>
                    )}

                    {rows.map((row, idx) => {
                      const statusMeta = getInvoiceStatusMeta(row.status);
                      const isFetching = fetchingDetailId === row.invoice_number;

                      return (
                        <tr key={`${row.invoice_number || "row"}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td className="gcl-col-booking-no">
                            {row.invoice_number || "-"}
                          </td>
                          <td>{formatYmdToDmy(row.invoice_date)}</td>
                          <td className="gcl-col-booking-no">
                            {row.job_no || "-"}
                          </td>
                          <td className="gcl-col-booking-no">
                            {row.hbl || "-"}
                          </td>
                          <td className="gcl-col-booking-no">
                            {row.destination || "-"}
                          </td>
                          <td>{row.type || "-"}</td>
                          <td>{formatYmdToDmy(row.atd)}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={statusMeta.className}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td>
                            {statusMeta.label.toLowerCase() === "paid"
                              ? "-" 
                              : (row.aging != null ? `${row.aging} day(s)` : "-")}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {/* Tombol Detail yang memiliki loading state */}
                            <button
                              type="button"
                              className="gcl-btn gcl-btn-sm gcl-btn-outline"
                              onClick={() => handleOpenDetail(row)}
                              disabled={isFetching}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: isFetching ? "wait" : "pointer"
                              }}
                            >
                              {isFetching ? (
                                <>
                                  <FaSpinner className="fa-spin" /> Loading...
                                </>
                              ) : (
                                <>
                                  <FaInfoCircle /> Detail
                                </>
                              )}
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
      </div>

      {/* MODAL DETAIL */}
      <InvoiceDetailModal
        open={showDetail}
        invoice={selectedInvoice}
        onClose={handleCloseDetail}
      />
    </GclLayout>
  );
}

export default InvoiceList;