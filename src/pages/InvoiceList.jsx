// src/pages/InvoiceList.jsx
import { useEffect, useState } from "react";
import { FaInfoCircle, FaFileInvoiceDollar, FaFileAlt, FaTimes } from "react-icons/fa";
import GclLayout from "../layouts/GclLayout";

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

  const statusMeta = getInvoiceStatusMeta(invoice.status);
  const invoiceUrl = invoice.url || "";
  // NOTE:
  // Backend disarankan menambah field 'faktur_url' / 'efaktur_url' di API
  const fakturUrl = invoice.faktur_url || invoice.efaktur_url || "";

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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            {/* Kolom kiri – detail invoice */}
            <div className="gcl-form-column">
              <div className="gcl-form-group">
                <label>Invoice Number</label>
                <div>{invoice.invoice_number || "-"}</div>
              </div>
              <div className="gcl-form-group">
                <label>Invoice Date</label>
                <div>{formatYmdToDmy(invoice.invoice_date)}</div>
              </div>
              <div className="gcl-form-group">
                <label>Customer</label>
                <div style={{ whiteSpace: "pre-line" }}>
                  {invoice.kepada || "-"}
                </div>
              </div>
              <div className="gcl-form-group">
                <label>SI Number</label>
                <div>{invoice.si_number || "-"}</div>
              </div>
              <div className="gcl-form-group">
                <label>Status</label>
                <span className={statusMeta.className}>{statusMeta.label}</span>
              </div>
              <div className="gcl-form-group">
                <label>Aging</label>
                <div>
                  {invoice.aging != null ? `${invoice.aging} day(s)` : "-"}
                </div>
              </div>
            </div>

            {/* Kolom kanan – shipment info */}
            <div className="gcl-form-column">
              <div className="gcl-form-group">
                <label>Job No</label>
                <div>{invoice.job_no || "-"}</div>
              </div>
              <div className="gcl-form-group">
                <label>HBL</label>
                <div>{invoice.hbl || "-"}</div>
              </div>
              <div className="gcl-form-group">
                <label>Destination</label>
                <div>{invoice.destination || "-"}</div>
              </div>
              <div className="gcl-form-group">
                <label>Shipment Type</label>
                <div>{invoice.type || "-"}</div>
              </div>
              <div className="gcl-form-group">
                <label>ATD</label>
                <div>{formatYmdToDmy(invoice.atd)}</div>
              </div>
              <div className="gcl-form-group">
                <label>Booking Code</label>
                <div>{invoice.booking_code || "-"}</div>
              </div>
            </div>
          </div>

          {/* Tombol aksi invoice & faktur pajak */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="gcl-btn gcl-btn-primary"
              onClick={handleOpenInvoice}
              disabled={!invoiceUrl}
            >
              <FaFileInvoiceDollar /> Open Invoice PDF
            </button>

            <button
              type="button"
              className="gcl-btn gcl-btn-ghost"
              onClick={handleOpenFaktur}
              disabled={!fakturUrl}
            >
              <FaFileAlt /> Open Tax Invoice (Faktur)
            </button>

            {!fakturUrl && (
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                Faktur pajak belum tersedia di API (perlu field{" "}
                <code>faktur_url</code> / <code>efaktur_url</code>).
              </span>
            )}
          </div>

          {/* Preview iframe (optional) */}
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

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("gcl_access_token");
        if (!token) {
          throw new Error("Token tidak ditemukan, silakan login ulang.");
        }

        const url = `${API_BASE}/api/invoice_api?X-API-KEY=gateway-fms`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`, // kalau backend tidak butuh, bisa dihapus
          },
        });

        const json = await res.json();
        console.log("Invoice API response:", json);

        if (!res.ok || !json.status) {
          throw new Error(
            json.message || json.data?.message || "Gagal mengambil data invoice."
          );
        }

        const list = Array.isArray(json.data?.data) ? json.data.data : [];
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

  const handleOpenDetail = (row) => {
    setSelectedInvoice(row);
    setShowDetail(true);
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
            height: "calc(100vh - 160px)",
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
                            {row.aging != null ? `${row.aging} day(s)` : "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="gcl-btn gcl-btn-sm gcl-btn-outline"
                              onClick={() => handleOpenDetail(row)}
                              style={{
                                display: "inline-flex",
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
