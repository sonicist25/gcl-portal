// src/pages/QuotationDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function formatIDR(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(ymd) {
  if (!ymd) return "-";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export default function QuotationDetail() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `https://gateway-cl.com/api/api_quotation/detail/${encodeURIComponent(name)}`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        setQ(json.data || json);
      } catch (err) {
        console.error(err);
        setError("Gagal ambil data quotation.");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [name]);

  if (loading) {
    return (
      <div className="page flex justify-center items-center h-screen bg-gradient-to-r from-blue-50 to-yellow-50">
        <div className="rounded-lg shadow-lg bg-white p-6 border-t-4 border-blue-500">
          <h2 className="text-xl font-bold text-blue-700 mb-2">Loading Quotation...</h2>
          <p className="text-gray-600">Please wait.</p>
        </div>
      </div>
    );
  }

  if (error || !q) {
    return (
      <div className="page flex justify-center items-center h-screen bg-gradient-to-r from-blue-50 to-yellow-50">
        <div className="rounded-lg shadow-lg bg-white p-6 border-t-4 border-yellow-500">
          <h2 className="text-xl font-bold text-blue-700 mb-2">Quotation Detail</h2>
          <p className="text-red-500 mb-4">{error || "Data tidak ditemukan."}</p>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
            onClick={() => navigate("/quotations")}
          >
            &larr; Back to List
          </button>
        </div>
      </div>
    );
  }

  const items = q.items || [];
  const commodities = q.commodity || [];
  const firstCommodity = commodities[0]?.commodity || "-";

  const polPodItem = items.find((it) => it.pol_pod === 1);
  const portOfDestination = polPodItem?.port_of_destination || null;

  return (
    <div className="page p-6 bg-gradient-to-r from-blue-50 to-yellow-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700">Quotation Detail</h1>
        <button
          className="px-4 py-2 rounded bg-yellow-400 text-blue-900 font-semibold hover:bg-yellow-500 transition"
          onClick={() => navigate("/quotations")}
        >
          &larr; Back to List
        </button>
      </div>

      {/* Quotation Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-500">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-blue-700">{q.name}</h2>
            <p className="text-gray-600">
              {q.subject || "Quotation"} · {q.service || "-"} ({q.type || "-"})
            </p>
          </div>
          <div className="text-right text-sm text-gray-700">
            <div className="font-semibold">Status: {q.status}</div>
            <div>Trans. Date: {formatDate(q.transaction_date)}</div>
            <div>Valid Till: {formatDate(q.valid_till)}</div>
            <div>Incoterm: {q.incoterm || "-"}</div>
            <div>Sales: {q.sales_person || "-"}</div>
          </div>
        </div>
      </div>

      {/* Customer + Shipment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold text-blue-700 mb-3">Customer</h3>
          <div className="text-sm space-y-1 text-gray-700">
            <div className="font-semibold">{q.customer_name}</div>
            {q.contact_person && <div>Contact: {q.contact_person}</div>}
            {q.contact_email && <div>Email: {q.contact_email}</div>}
            {q.contact_mobile && <div>Mobile: {q.contact_mobile}</div>}
            {q.customer_address && <div>Address: {q.customer_address}</div>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-400">
          <h3 className="text-lg font-semibold text-blue-700 mb-3">Shipment Info</h3>
          <div className="text-sm space-y-1 text-gray-700">
            <div>
              <span className="font-semibold">Port of Loading:</span>{" "}
              <span className="uppercase">{q.port_of_loading || "-"}</span>
            </div>

            <div>
              <span className="font-semibold">Port of Destination:</span>{" "}
              <span className="uppercase">{portOfDestination || "-"}</span>
            </div>
            <div><span className="font-semibold">Pick Up:</span> {q.pick_up || "-"}</div>
            <div><span className="font-semibold">Delivery:</span> {q.delivery || "-"}</div>
            <div><span className="font-semibold">Measurement:</span> {q.measurement || "-"}</div>
            <div><span className="font-semibold">Commodity:</span> {firstCommodity}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-yellow-500">
        <h3 className="text-lg font-semibold text-blue-700 mb-3">Charge Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded">
            <thead className="bg-blue-100 text-blue-900">
              <tr>
                <th className="px-3 py-2 text-left">No</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Group</th>
                {/* <th className="px-3 py-2 text-left">POL / POD</th> */}
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-3 text-gray-500">
                    No items.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={it.name || idx} className="hover:bg-yellow-50">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2 uppercase">
                      {it.description || it.item_name}
                    </td>
                    <td className="px-3 py-2">{it.group_description || "-"}</td>
                    {/* <td className="px-3 py-2">
                      {it.pol_pod === 1 ? it.port_of_destination || "-" : ""}
                    </td> */}
                    <td className="px-3 py-2 text-right">{it.qty} {it.uom}</td>
                    <td className="px-3 py-2 text-right">{formatIDR(it.rate)}</td>
                    <td className="px-3 py-2 text-right">{formatIDR(it.amount)}</td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-500 max-w-md ml-auto">
        <h3 className="text-lg font-semibold text-blue-700 mb-3">Summary</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div className="flex justify-between">
            <span>Net Total</span>
            <span>{formatIDR(q.net_total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>{formatIDR(q.discount_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes &amp; Charges</span>
            <span>{formatIDR(q.total_taxes_and_charges)}</span>
          </div>
          <hr className="my-2 border-gray-300" />
          <div className="flex justify-between font-semibold text-base text-blue-800">
            <span>Grand Total</span>
            <span>{formatIDR(q.grand_total)}</span>
          </div>
          {q.in_words && (
            <div className="mt-2 text-xs italic text-gray-500">
              {q.in_words}
            </div>
          )}
        </div>
      </div>

      {/* Terms & Conditions */}
      {q.terms && q.terms.trim() !== "" && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-blue-700 mb-3">Terms &amp; Conditions</h3>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: q.terms }}
          />
        </div>
      )}
    </div>
  );
}