// src/components/QuoteRequestModal.jsx
import React, { useState, useEffect } from "react";

export default function QuoteRequestModal({ isOpen, onClose, rateData }) {
  // State untuk form input
  const [formData, setFormData] = useState({
    quantity: "",
    packaging: "Carton",
    weight: "",
    volume: "",
    readyDate: "",
    expectEtd: "",
    notes: ""
  });

  // Reset form setiap kali modal dibuka dengan data baru
  useEffect(() => {
    if (isOpen) {
      setFormData({
        quantity: "",
        packaging: "Carton",
        weight: "",
        volume: "",
        readyDate: "",
        expectEtd: "",
        notes: ""
      });
    }
  }, [isOpen, rateData]);

  if (!isOpen) return null;

  // Normalisasi data route agar aman untuk LCL/FCL/Air
  const origin = rateData?.origin || rateData?.region || rateData?.region_id || "JAKARTA";
  const destination = rateData?.destination || rateData?.destination_code || "Destination";
  const serviceType = rateData?.serviceType || "Freight Service"; // Dikirim dari parent
  const carrier = rateData?.airline || rateData?.carrier || "-";

  const handleSubmit = (e) => {
    e.preventDefault();
    // Disini logika kirim data ke API backend
    console.log("Submitting Quote Request:", {
      route: { origin, destination, serviceType, carrier },
      details: formData,
      rateId: rateData?.id
    });
    
    alert("Permintaan penawaran berhasil dikirim!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header: Menampilkan Detail Route */}
        <div className="bg-blue-800 p-5 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg leading-tight">Request Quote</h3>
              <p className="text-blue-200 text-xs uppercase tracking-wider mt-1 font-semibold">
                {serviceType}
              </p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          
          {/* Route Display Box */}
          <div className="mt-4 flex items-center gap-3 bg-blue-900/50 p-3 rounded-lg border border-blue-700/50">
            <div className="flex-1 text-center">
              <div className="text-xs text-blue-300 uppercase">From</div>
              <div className="font-bold text-sm truncate">{origin}</div>
            </div>
            <div className="text-blue-400 font-bold">&rarr;</div>
            <div className="flex-1 text-center">
              <div className="text-xs text-blue-300 uppercase">To</div>
              <div className="font-bold text-sm truncate">{destination}</div>
            </div>
            {carrier !== "-" && (
               <div className="border-l border-blue-700 pl-3 ml-1 text-center">
                 <div className="text-xs text-blue-300 uppercase">Carrier</div>
                 <div className="font-bold text-sm">{carrier}</div>
               </div>
            )}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Row 1: Qty & Packaging */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantity</label>
              <input
                type="number" required min="1"
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent transition-colors"
                placeholder="0"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Packaging</label>
              <select
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent"
                value={formData.packaging}
                onChange={e => setFormData({...formData, packaging: e.target.value})}
              >
                <option value="Carton">Carton</option>
                <option value="Pallet">Pallet</option>
                <option value="Crate">Crate</option>
                <option value="Bag">Bag</option>
                <option value="Drum">Drum</option>
                <option value="Loose">Loose</option>
              </select>
            </div>
          </div>

          {/* Row 2: Weight & Volume */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Weight (KG)</label>
              <input
                type="number" required min="0" step="0.01"
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent"
                placeholder="0.00"
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Volume (CBM)</label>
              <input
                type="number" required min="0" step="0.001"
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent"
                placeholder="0.000"
                value={formData.volume}
                onChange={e => setFormData({...formData, volume: e.target.value})}
              />
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo Ready Date</label>
              <input
                type="date" required
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent text-sm"
                value={formData.readyDate}
                onChange={e => setFormData({...formData, readyDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expected ETD</label>
              <input
                type="date" required
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent text-sm"
                value={formData.expectEtd}
                onChange={e => setFormData({...formData, expectEtd: e.target.value})}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks / Commodity</label>
            <textarea
              rows="2"
              className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. General Cargo, Non-Stackable..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-yellow-400 text-blue-900 rounded-lg font-bold hover:bg-yellow-500 transition shadow-md"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}