// src/pages/QuotationDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/authApi";
import GclLayout from "../layouts/GclLayout"; // Asumsi Anda ingin pakai layout yang sama

function formatCurrency(value, currency = "IDR") {
  if (value == null || value === "") return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(ymd) {
  if (!ymd) return "-";
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(d);
}

export default function QuotationDetail() {
  const { id } = useParams(); // Menggunakan ID dari URL param
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setError("");

        // PENTING: Gunakan apiFetch agar JWT dikirim ke Header
        const json = await apiFetch(`/crm/Api_customer/quotations?quote_id=${id}`);

        if (json?.status === false) {
          throw new Error(json.message || "Failed to load quotation detail.");
        }

        setData(json.data);
      } catch (err) {
        console.error(err);
        setError(err.message === "SESSION_EXPIRED" ? "Session expired." : "Data tidak ditemukan atau akses ditolak.");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <GclLayout>
        <div className="flex justify-center items-center h-[70vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-bold text-gray-700">Loading Quotation...</h2>
            <p className="text-gray-500">Retrieving details securely.</p>
          </div>
        </div>
      </GclLayout>
    );
  }

  if (error || !data || !data.quote) {
    return (
      <GclLayout>
        <div className="flex justify-center items-center h-[70vh]">
          <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-red-500 text-center max-w-md w-full">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "Quotation data could not be found or you don't have access."}</p>
            <button
              className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-md"
              onClick={() => navigate("/quotations")}
            >
              Back to Quotation List
            </button>
          </div>
        </div>
      </GclLayout>
    );
  }

  const { quote, items } = data;
  const groups = items?.groups || {};
  const hasItems = Object.values(groups).some(arr => arr && arr.length > 0);

  return (
    <GclLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans">
        
        {/* Top Actions */}
        <div className="flex justify-between items-center mb-6">
          <button
            className="flex items-center text-blue-700 hover:text-blue-900 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition"
            onClick={() => navigate("/quotations")}
          >
            <span className="mr-2">&larr;</span> Back to List
          </button>
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
             quote.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
             quote.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
             'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}>
            {quote.status}
          </div>
        </div>

        {/* Header Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 mb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">{quote.quote_no}</h1>
              <p className="text-gray-500 mt-1 font-medium">{quote.account_name}</p>
            </div>
            <div className="mt-4 md:mt-0 text-left md:text-right text-sm">
              <div className="text-gray-500">Quotation Date: <span className="font-semibold text-gray-800">{formatDate(quote.quote_date)}</span></div>
              <div className="text-gray-500">Valid Until: <span className="font-semibold text-red-600">{formatDate(quote.valid_until)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Service Level</div>
              <div className="font-semibold text-gray-800">{quote.service_level || "-"}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Transport Mode</div>
              <div className="font-semibold text-gray-800">{quote.transport_mode || quote.shipment_type || "-"}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Origin (POL)</div>
              <div className="font-semibold text-gray-800">{quote.origin || "-"}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Destination (POD)</div>
              <div className="font-semibold text-gray-800">{quote.destination || "-"}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">Charge Details</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-blue-50 text-blue-900 border-b border-blue-100">
                <tr>
                  <th className="p-3 font-semibold">Description</th>
                  <th className="p-3 font-semibold">Qty</th>
                  <th className="p-3 font-semibold">UOM</th>
                  <th className="p-3 font-semibold text-right">Unit Price</th>
                  <th className="p-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!hasItems && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400">
                      No item details available for this quotation.
                    </td>
                  </tr>
                )}

                {/* Render Group by Group */}
                {['ORIGIN', 'FREIGHT', 'DESTINATION'].map((groupName) => {
                  const groupItems = groups[groupName] || [];
                  if (groupItems.length === 0) return null;

                  return (
                    <React.Fragment key={groupName}>
                      {/* Group Header */}
                      <tr className="bg-gray-50/80">
                        <td colSpan="5" className="p-2 px-4 text-xs font-bold text-gray-500 tracking-wider">
                          {groupName} CHARGES
                        </td>
                      </tr>
                      {/* Group Items */}
                      {groupItems.map((it, idx) => (
                        <tr key={`${groupName}-${idx}`} className="hover:bg-blue-50/30 transition">
                          <td className="p-3 font-medium text-gray-800">
                            {it.description || it.charge_code}
                            {it.charge_detail && <div className="text-xs text-gray-500 mt-0.5">{it.charge_detail}</div>}
                          </td>
                          <td className="p-3 text-gray-600">{it.qty}</td>
                          <td className="p-3 text-gray-600">{it.uom || "-"}</td>
                          <td className="p-3 text-right text-gray-600">{formatCurrency(it.unit_price, it.currency)}</td>
                          <td className="p-3 text-right font-medium text-gray-800">{formatCurrency(it.amount, it.currency)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Summary */}
        <div className="flex justify-end">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full md:w-80">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Origin Charges</span>
                <span>{formatCurrency(items?.subtotal?.ORIGIN, quote.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Freight Charges</span>
                <span>{formatCurrency(items?.subtotal?.FREIGHT, quote.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Destination Charges</span>
                <span>{formatCurrency(items?.subtotal?.DESTINATION, quote.currency)}</span>
              </div>
              
              <div className="pt-3 mt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-base">Grand Total</span>
                  <span className="font-extrabold text-blue-700 text-lg">
                    {formatCurrency(quote.total_amount || items?.subtotal?.TOTAL, quote.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </GclLayout>
  );
}