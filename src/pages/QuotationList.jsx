// src/pages/QuotationList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GclLayout from "../layouts/GclLayout";
import { apiFetch } from "../utils/authApi";
// 1. Import komponen Modal (Sesuaikan path-nya jika berbeda)
import QuoteRequestModal from "./QuoteRequestModal";

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

function formatCurrency(value, currency = "IDR") {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export default function QuotationList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // 2. Tambahkan state untuk Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");

      try {
        const token = localStorage.getItem("gcl_access_token");
        if (!token) {
           navigate("/login");
           return;
        }

        const json = await apiFetch("/crm/Api_customer/quotations");

        if (json?.status === false) {
           throw new Error(json.message || "Failed to fetch quotations");
        }

        const data = Array.isArray(json?.data) ? json.data : [];
        setRows(data);
      } catch (err) {
        if (err.message !== "SESSION_EXPIRED") {
            console.error("Fetch error:", err); 
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
      <div className="gcl-page-container p-4 md:p-6">
        {/* Header Section */}
        <div className="gcl-page-header flex flex-col md:flex-row justify-between md:items-end mb-6">
          <div>
            <nav className="text-sm text-gray-500 mb-2">
              <span>Dashboard</span> / <span className="text-blue-600 font-semibold">Quotations</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-800">Active Quotations</h1>
            <p className="text-gray-500">
              Manage and view your submitted freight quotations.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-sm font-semibold">
              Total: {rows.length}
            </span>
          </div>
        </div>

        {/* === AREA KONTEN === */}
        
        {/* 1. Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
            <p className="text-white">Syncing data securely...</p>
          </div>
        )}

        {/* 2. Error State */}
        {!loading && errorMsg && (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <div className="bg-red-500/20 text-red-300 p-4 rounded-full mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Oops! Something went wrong</h3>
            <p className="text-blue-200 mb-4">{errorMsg}</p>
            <button 
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        )}

        {/* 3. Empty State (TRANSPARAN) */}
        {!loading && !errorMsg && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[500px] w-full">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              
              <div className="relative w-28 h-28 bg-white/5 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
                <svg className="w-12 h-12 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg text-[#0a2558]">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path>
                   </svg>
                </div>
              </div>
            </div>

            <h3 className="text-3xl font-bold text-white mb-3 tracking-wide">
              No Quotations Found
            </h3>
            <p className="text-blue-100/80 max-w-md mx-auto leading-relaxed mb-10 text-base font-light">
              You don't have any active quotations at the moment. <br/>
              When our sales team sends you a quote, it will safely land here.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>
              
              {/* 3. Ubah onClick untuk memanggil modal */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-yellow-400 text-[#0a2558] font-bold rounded-lg hover:bg-yellow-500 transition-all shadow-lg flex items-center justify-center"
              >
                Contact Sales
              </button>
            </div>
          </div>
        )}

        {/* 4. Data Table */}
        {!loading && !errorMsg && rows.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-sm font-semibold text-gray-600">Quote No.</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Mode</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Route (Origin ➝ Dest)</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Valid Until</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 text-right">Amount</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 text-center">Status</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.quote_id} className="border-b border-gray-50 hover:bg-blue-50/50 transition">
                      <td className="p-4">
                        <div className="font-bold text-blue-700">{row.quote_no}</div>
                        <div className="text-xs text-gray-500">{formatDate(row.quote_date)}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium uppercase tracking-wider">
                          {row.transport_mode || row.shipment_type || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-medium text-gray-800">{row.origin || "-"}</span>
                          <span className="text-gray-400">➝</span>
                          <span className="font-medium text-gray-800">{row.destination || "-"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {formatDate(row.valid_until)}
                      </td>
                      <td className="p-4 text-sm font-semibold text-right text-gray-800">
                        {formatCurrency(row.total_amount, row.currency)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          row.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          row.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => navigate(`/quotations/${row.quote_id}`)}
                          className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
      </div>

      {/* 4. Render Komponen Modal di luar container utama */}
      <QuoteRequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        // Kirim data dummy/general karena ini dari halaman empty state (bukan dari rate spesifik)
        rateData={{
          origin: "ANY ORIGIN",
          destination: "ANY DESTINATION",
          serviceType: "General Freight Inquiry",
          carrier: "-"
        }}
      />
    </GclLayout>
  );
}