// src/pages/QuotationList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GclLayout from "../layouts/GclLayout";

// Helper: Format Date (International Standard: 05 Feb 2026)
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function QuotationList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");

      try {
        const token = localStorage.getItem("gcl_access_token");

        if (!token) {
           // Redirect silent ke login jika tidak ada token
           navigate("/login");
           return;
        }

        const res = await fetch(`https://gateway-cl.com/api/api_quotation/list`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        // Handle Session Expired (401)
        if (res.status === 401) {
          localStorage.removeItem("gcl_access_token"); // Hapus token kadaluarsa
          localStorage.removeItem("gcl_refresh_token");
          navigate("/login"); // Tendang ke login page
          throw new Error("Session expired"); // Stop eksekusi
        }

        if (!res.ok) {
          throw new Error("Unable to retrieve data. Please try again later.");
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
          valid_till: formatDate(q.valid_till),
          quoter: q.sales_person || "System",
          status: q.status || "Submitted"
        }));

        setRows(mapped);
      } catch (err) {
        // Jangan log error detail ke console user di production, cukup pesan umum
        if (err.message !== "Session expired") {
            console.error("Data fetch error"); 
            setErrorMsg("Currently unable to load quotations. Please check your connection.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate]);

  return (
    <GclLayout>
      <div className="gcl-page-container">
        {/* Header Section */}
        <div className="gcl-page-header">
          <div>
            <nav className="gcl-breadcrumb">
              <span>Sales</span> / <span className="active">Quotations</span>
            </nav>
            <h1 className="gcl-page-title">Active Quotations</h1>
            <p className="gcl-page-subtitle">
              Manage and view your submitted freight quotations.
            </p>
          </div>

          <div className="gcl-header-actions">
            <span className="gcl-badge-count">
              Total: <strong>{rows.length}</strong>
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="gcl-card">
          
          {/* Loading State */}
          {loading && (
            <div className="gcl-state-empty">
              <div className="spinner"></div>
              <p>Syncing data from ERP...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && errorMsg && (
            <div className="gcl-state-error">
              <p>{errorMsg}</p>
              <button className="gcl-btn-retry" onClick={() => window.location.reload()}>
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !errorMsg && rows.length === 0 && (
            <div className="gcl-state-empty">
              <img 
                src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" 
                alt="Empty" 
                style={{width: '64px', opacity: 0.5, marginBottom: '16px'}}
              />
              <h3>No Active Quotations</h3>
              <p>You don't have any submitted quotations at the moment.</p>
            </div>
          )}

          {/* Data Table */}
          {!loading && !errorMsg && rows.length > 0 && (
            <div className="gcl-table-responsive">
              <table className="gcl-table">
                <thead>
                  <tr>
                    <th>Quotation No.</th>
                    <th>Service</th>
                    <th>Route (POL - POD)</th>
                    <th>Incoterm</th>
                    <th>Valid Until</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium text-primary">
                        {row.number}
                        <div className="mobile-label">{row.quoter}</div>
                      </td>
                      <td>
                        <span className="gcl-tag-service">{row.service}</span>
                      </td>
                      <td>
                        <div className="route-info">
                          <span>{row.origin}</span>
                          <span className="arrow">➝</span>
                          <span>{row.destination}</span>
                        </div>
                      </td>
                      <td>{row.incoterm}</td>
                      <td>{row.valid_till}</td>
                      <td>
                        <span className="gcl-badge-status success">
                          {row.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="gcl-btn-outline-sm"
                          onClick={() => navigate(`/quotations/${encodeURIComponent(row.number)}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Footer Note */}
          {!loading && rows.length > 0 && (
             <div className="gcl-card-footer">
                <small>Data synchronized securely from ERPNext.</small>
             </div>
          )}
        </div>
      </div>
    </GclLayout>
  );
}