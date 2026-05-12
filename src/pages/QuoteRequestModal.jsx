import React, { useState, useEffect } from "react";
import AsyncSelect from "react-select/async";
import { apiFetch } from "../utils/authApi"; // <-- Tambahkan baris ini

export default function QuoteRequestModal({ isOpen, onClose, rateData }) {
  // State untuk form input, ditambahkan origin dan destination
  const [formData, setFormData] = useState({
    origin: null,
    destination: null,
    quantity: "",
    packaging: "Carton",
    weight: "",
    volume: "",
    readyDate: "",
    expectEtd: "",
    notes: ""
  });

  // Reset form & set initial route dari rateData setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      const initOrigin = rateData?.origin || rateData?.region || rateData?.region_id;
      const initDest = rateData?.destination || rateData?.destination_code;

      setFormData({
        origin: initOrigin ? { label: initOrigin, value: initOrigin } : null,
        destination: initDest ? { label: initDest, value: initDest } : null,
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

  const serviceType = rateData?.serviceType || "Freight Service";
  const carrier = rateData?.airline || rateData?.carrier || "-";

  // ==========================================
  // Fungsi Load Data untuk AsyncSelect (Select2)
  // ==========================================
  const loadPortOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) return [];
    
    try {
      // Gunakan apiFetch agar X-API-KEY dan Token otomatis terkirim
      // Tidak perlu menuliskan domain lengkap jika apiFetch sudah menghandle baseURL
      const json = await apiFetch(`/port/get_dropdown_export/pod?q=${inputValue}`);

      // Karena dari Postman balasan API langsung berupa array: [ {code:..}, {code:..} ]
      // Kita pastikan formatnya dibaca dengan benar
      const items = Array.isArray(json) ? json : (json?.data || []);

      return items.map((port) => ({
        label: `${port.name} (${port.code})`,
        value: port.code
      }));
      
    } catch (e) {
      console.error("Gagal mengambil data port:", e);
      return [];
    }
  };
  // Custom styling untuk react-select agar menyatu dengan desain Tailwind Anda
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      border: 'none',
      borderBottom: state.isFocused ? '2px solid #2563EB' : '2px solid #E5E7EB',
      borderRadius: 0,
      boxShadow: 'none',
      backgroundColor: 'transparent',
      padding: 0,
      minHeight: '34px',
      '&:hover': { borderBottom: '2px solid #2563EB' }
    }),
    valueContainer: (base) => ({ ...base, padding: '0px 0px' }),
    singleValue: (base) => ({ ...base, color: '#111827', fontWeight: '500' }), // Teks warna gelap
    input: (base) => ({ ...base, color: '#111827' }),
    placeholder: (base) => ({ ...base, color: '#9CA3AF', fontSize: '0.875rem' }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      color: state.isSelected ? '#ffffff' : '#111827', // Teks putih jika dipilih, hitam/gelap jika tidak
      backgroundColor: state.isSelected 
        ? '#2563EB' // Latar biru pekat jika opsi sedang dipilih
        : state.isFocused 
          ? '#EFF6FF' // Latar biru sangat muda saat di-hover
          : 'white',  // Latar putih default
      cursor: 'pointer',
      fontWeight: '500'
    })
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting Quote Request:", {
      route: { 
        origin: formData.origin?.value, 
        destination: formData.destination?.value, 
        serviceType, 
        carrier 
      },
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
        
        {/* Header */}
        <div className="bg-blue-800 p-5 text-white flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg leading-tight">Request Quote</h3>
            <p className="text-blue-200 text-xs uppercase tracking-wider mt-1 font-semibold">
              {serviceType} {carrier !== "-" ? `• ${carrier}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Row 0: Origin & Destination (Select2) */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Origin</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadPortOptions}
                styles={customSelectStyles}
                placeholder="Search POL..."
                value={formData.origin}
                onChange={(val) => setFormData({ ...formData, origin: val })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Destination</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadPortOptions}
                styles={customSelectStyles}
                placeholder="Search POD..."
                value={formData.destination}
                onChange={(val) => setFormData({ ...formData, destination: val })}
                required
              />
            </div>
          </div>

          {/* Row 1: Qty & Packaging */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quantity</label>
              <input
                type="number" required min="1"
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent transition-colors text-gray-900 font-medium"
                placeholder="0"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Packaging</label>
              <select
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent text-gray-900 font-medium"
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Total Weight (KG)</label>
              <input
                type="number" required min="0" step="0.01"
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent text-gray-900 font-medium"
                placeholder="0.00"
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Volume (CBM)</label>
              <input
                type="number" required min="0" step="0.001"
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent text-gray-900 font-medium"
                placeholder="0.000"
                value={formData.volume}
                onChange={e => setFormData({...formData, volume: e.target.value})}
              />
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cargo Ready Date</label>
              <input
                type="date" required
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent text-sm text-gray-900 font-medium"
                value={formData.readyDate}
                onChange={e => setFormData({...formData, readyDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Expected ETD</label>
              <input
                type="date" required
                className="w-full border-b-2 border-gray-200 focus:border-blue-600 outline-none py-1.5 bg-transparent text-sm text-gray-900 font-medium"
                value={formData.expectEtd}
                onChange={e => setFormData({...formData, expectEtd: e.target.value})}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Remarks / Commodity</label>
            <textarea
              rows="2"
              className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium bg-white"
              placeholder="e.g. General Cargo, DG Cargo, Non-Stackable..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition"
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