// src/pages/QuotationList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GclLayout from "../layouts/GclLayout";


const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function QuotationList() {
  const navigate = useNavigate(); // <-- INI WAJIB
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");

      try {
        const res = await fetch(`https://gateway-cl.com/api/api_quotation/list`, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : json;

        const mapped = (data || []).map((q, idx) => ({
          id: idx + 1,
          number: q.name,
          service: q.service || "-",
          origin: q.port_of_loading || q.pick_up || "-",
          destination: q.delivery || "-",
          incoterm: q.incoterm || "-",
          valid_till_raw: q.valid_till,
          valid_till: formatDate(q.valid_till),
          quoter: q.sales_person || "-",
        }));

        setRows(mapped);
      } catch (err) {
        console.error("Failed to load quotations:", err);
        setErrorMsg("Gagal memuat data quotation. Coba lagi nanti.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleDetail = (row) => {
    // nanti bisa diarahkan ke /quotations/:number atau modal
    alert(`Detail quotation: ${row.number}`);
  };

  return (
    <GclLayout>
      <div className="gcl-rates-page">
        {/* Header */}
        <div className="gcl-rates-header">
          <div>
            <div className="gcl-rates-breadcrumb">
              Sales & CRM / Quotations
            </div>
            <div className="gcl-rates-title">Customer Quotations</div>
            <div className="gcl-rates-subtitle">
              Daftar quotation dengan status <b>Submitted</b> dari ERP.
            </div>
          </div>

          <div className="gcl-rates-header-right">
            <div className="gcl-rates-summary-badge">
              Total: {rows.length} quotation
            </div>
          </div>
        </div>

        {/* Card wrapper */}
        <div className="gcl-rates-card">
          {/* Summary bar */}
          <div className="gcl-rates-summary">
            <div>
              <div className="gcl-rates-summary-title">
                Quotation aktif (Submitted)
              </div>
              <div className="gcl-rates-summary-meta">
                Menampilkan quotation dari berbagai service & incoterm.
              </div>
            </div>
            <div className="gcl-rates-summary-badge">
              {rows.length} records
            </div>
          </div>

          {/* Status loading / error */}
          {loading && (
            <div className="gcl-rates-empty">Memuat quotation…</div>
          )}

          {!loading && errorMsg && (
            <div className="gcl-rates-empty" style={{ color: "#f97373" }}>
              {errorMsg}
            </div>
          )}

          {!loading && !errorMsg && rows.length === 0 && (
            <div className="gcl-rates-empty">
              Belum ada quotation dengan status <b>Submitted</b>.
            </div>
          )}

          {!loading && !errorMsg && rows.length > 0 && (
            <div className="gcl-rates-table-wrapper">
              <table className="gcl-rates-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>No. Quotation</th>
                    <th>Service</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Incoterm</th>
                    <th>Valid Till</th>
                    <th>Quoter</th>
                    <th className="gcl-col-action">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td className="gcl-rates-lane">{row.number}</td>
                      <td>{row.service}</td>
                      <td>{row.origin}</td>
                      <td>{row.destination}</td>
                      <td>{row.incoterm}</td>
                      <td>{row.valid_till}</td>
                      <td>{row.quoter}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="gcl-book-pill-btn"
                           onClick={() =>
                                navigate(`/quotations/${encodeURIComponent(row.number)}`)
                             }
                        >
                        Detail
                        </button>
                     </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="gcl-rates-footer-note">
            Data diambil dari ERPNext via API Quotation (status: Submitted).
          </div>
        </div>
      </div>
    </GclLayout>
  );
}
