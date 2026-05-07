import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

const API_LOGIN_URL = "https://gateway-cl.com/api/Customer_login/login"; 
// Endpoint baru untuk request access (Sesuaikan dengan route CodeIgniter Anda)
const API_REQUEST_URL = "https://gateway-cl.com/api/Customer_login/request_access"; 

function LoginPage() {
  const navigate = useNavigate();
  
  // State Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // State Modal Request Access & Security
  // --- STATE MODAL & SECURITY ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reqCompany, setReqCompany] = useState("");
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqHoneypot, setReqHoneypot] = useState(""); 
  
  // State Baru untuk Slider Captcha
  const [sliderValue, setSliderValue] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const [reqLoading, setReqLoading] = useState(false);
  const [reqMessage, setReqMessage] = useState({ type: "", text: "" });

  // Fungsi saat slider digeser
  const handleSliderChange = (e) => {
    if (isVerified) return; // Kunci jika sudah terverifikasi
    
    const val = parseInt(e.target.value);
    setSliderValue(val);
    
    // Jika user menggeser sampai mentok kanan (berikan toleransi > 95)
    if (val > 95) {
      setSliderValue(100);
      setIsVerified(true);
      setReqMessage({ type: "", text: "" }); // Bersihkan error jika ada
    }
  };

  // Fungsi jika slider dilepas sebelum mentok kanan
  const handleSliderRelease = () => {
    if (!isVerified) {
      setSliderValue(0); // Kembali ke kiri (bouncing back)
    }
  };

  const handleRequestAccess = () => {
    setReqMessage({ type: "", text: "" });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setReqCompany("");
    setReqName("");
    setReqEmail("");
    setReqHoneypot("");
    // Reset Slider
    setSliderValue(0);
    setIsVerified(false);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (reqHoneypot !== "") {
       handleCloseModal(); 
       return;
    }

    // Validasi Slider Captcha
    if (!isVerified) {
      setReqMessage({ type: "error", text: "Silakan geser slider ke kanan untuk verifikasi." });
      return;
    }

    setReqLoading(true);
    setReqMessage({ type: "", text: "" });

    try {
      const res = await fetch(API_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          company_name: reqCompany,
          user_name: reqName,
          email: reqEmail
        }),
      });

      if (res.ok || res.status === 200) {
        setReqMessage({ type: "success", text: "Request terkirim! Tim kami akan menghubungi Anda." });
        setTimeout(() => handleCloseModal(), 3000);
      } else {
        throw new Error("Gagal mengirim request ke server.");
      }
    } catch (err) {
      setReqMessage({ type: "error", text: err.message || "Terjadi kesalahan sistem." });
    } finally {
      setReqLoading(false);
    }
  };

  // Data fitur yang di-mapping ke gambar di folder public
  const features = [
    { title: "Shipping Schedule", image: "/Schedules.jpg" },
    { title: "Shipping Rates", image: "/Rates.jpg" },
    { title: "Quotations", image: "/Quotations.jpg" },
    { title: "Booking Online", image: "/Online Booking.jpg" },
    { title: "Shipment List", image: "/Shipment List.jpg" },
    { title: "Tracking Cargo", image: "/Tracking.jpg" },
    { title: "Invoice & Tax", image: "/Invoice & Tax.jpg" },
    { title: "Predictive ETA", image: "/Predictive.jpg" },
    { title: "Shipment News", image: "/News.jpg" },
  ];

  // Menggandakan array agar animasi tidak terputus
  const duplicatedFeatures = [...features, ...features, ...features];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(API_LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          shipper_id: username,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Login gagal (HTTP ${res.status})`);
      }

      if (!data.status) {
        throw new Error(data.message || "Login gagal (status=false).");
      }

      localStorage.setItem("gcl_access_token", data.access_token);
      localStorage.setItem("gcl_refresh_token", data.refresh_token || "");
      localStorage.setItem("gcl_token_expires", String(Date.now() + (data.expires_in || 0) * 1000));

      try {
        const parts = data.access_token.split(".");
        if (parts.length === 3) {
          const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const payloadJson = atob(payloadBase64);
          const payload = JSON.parse(payloadJson);
          const user = payload.data || null;

          if (user) {
            localStorage.setItem("gcl_user", JSON.stringify(user));
          }
          if (user && user.id_shipper) {
            localStorage.setItem("gcl_shipper_id", user.id_shipper);
          }
        }
      } catch (err) {
        console.warn("Gagal decode JWT:", err);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gcl-auth-wrapper">
      {/* --- TAMBAHKAN KODE INI (SHORTCUT MENU PUBLIK) --- */}
      <div className="gcl-login-quicklinks">
        <button onClick={() => navigate('/schedule')} className="gcl-quick-btn">
          Ship Schedule
        </button>
        <button onClick={() => navigate('/rates')} className="gcl-quick-btn">
          Rates / Tariff
        </button>
        <button onClick={() => navigate('/tracking')} className="gcl-quick-btn">
          Tracking
        </button>
      </div>
      {/* ----------------------------------------------- */}
      
      {/* Background Cards ala Netflix */}
      <div className="gcl-cards-bg">
        <div className="gcl-marquee-row left">
          {duplicatedFeatures.map((feat, i) => (
            <div 
              key={`r1-${i}`} 
              className="gcl-feature-card" 
              style={{ backgroundImage: `url('${encodeURI(feat.image)}')` }}
            >
              <span>{feat.title}</span>
            </div>
          ))}
        </div>
        <div className="gcl-marquee-row right">
          {duplicatedFeatures.reverse().map((feat, i) => (
            <div 
              key={`r2-${i}`} 
              className="gcl-feature-card" 
              style={{ backgroundImage: `url('${encodeURI(feat.image)}')` }}
            >
              <span>{feat.title}</span>
            </div>
          ))}
        </div>
        <div className="gcl-marquee-row left">
          {duplicatedFeatures.sort(() => Math.random() - 0.5).map((feat, i) => (
            <div 
              key={`r3-${i}`} 
              className="gcl-feature-card" 
              style={{ backgroundImage: `url('${encodeURI(feat.image)}')` }}
            >
              <span>{feat.title}</span>
            </div>
          ))}
        </div>
        <div className="gcl-marquee-row right">
           {duplicatedFeatures.map((feat, i) => (
            <div 
              key={`r4-${i}`} 
              className="gcl-feature-card" 
              style={{ backgroundImage: `url('${encodeURI(feat.image)}')` }}
            >
              <span>{feat.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay Gelap (Vignette) agar form login menonjol */}
      <div className="gcl-vignette-overlay"></div>

      {/* Login Form */}
      <div className="gcl-auth-overlay">
        <div className="gcl-glass-card">
          <div className="gcl-auth-logo">
            {/* Centered logo */}
            <img src="/minilogo.png" alt="Gateway Logo" className="gcl-logo-img" />
          </div>

          <h1 className="gcl-auth-title">Welcome Back</h1>
          <p className="gcl-auth-subtitle">Manage your shipments and logistics with ease.</p>

          {error && <div className="gcl-auth-alert error">{error}</div>}

          <form onSubmit={handleSubmit} className="gcl-auth-form">
            <div className="gcl-form-group">
              <input
                id="username"
                type="text"
                placeholder="Email or User ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="gcl-input modern"
              />
            </div>

            <div className="gcl-form-group">
              <input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="gcl-input modern"
              />
            </div>

            <button type="submit" className="gcl-auth-button modern" disabled={loading}>
              {loading ? "Processing..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* Teks Informasi Portal di Pojok Kanan Bawah */}
      <div className="gcl-portal-info">
        <div className="gcl-info-access">
          <h4>How to get access</h4>
          <p>
            New here? Request a username and password and we’ll set you up within one business day. <span className="gcl-link" onClick={handleRequestAccess}>Click here</span> or email our support team with your company name and contact details.
          </p>
        </div>
      </div>

      {/* --- MODAL REQUEST ACCESS --- */}
      {isModalOpen && (
        <div className="gcl-modal-wrapper">
          <div className="gcl-modal-backdrop" onClick={handleCloseModal}></div>
          <div className="gcl-modal-content">
            <button className="gcl-modal-close" onClick={handleCloseModal}>&times;</button>
            
            <h2 className="gcl-modal-title">Request Access</h2>
            <p className="gcl-modal-subtitle">Submit your details to get access.</p>
            
            {reqMessage.text && (
              <div className={`gcl-auth-alert ${reqMessage.type}`}>
                {reqMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="gcl-auth-form">
              <div className="gcl-form-group">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={reqCompany}
                  onChange={(e) => setReqCompany(e.target.value)}
                  className="gcl-input modern"
                  required
                />
              </div>
              <div className="gcl-form-group">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  className="gcl-input modern"
                  required
                />
              </div>
              <div className="gcl-form-group">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  className="gcl-input modern"
                  required
                />
              </div>

              {/* Honeypot Field */}
              <input 
                type="text" 
                className="gcl-honeypot" 
                value={reqHoneypot} 
                onChange={(e) => setReqHoneypot(e.target.value)} 
                tabIndex="-1" 
                autoComplete="off" 
              />

              {/* Math Captcha */}
             {/* Custom Slider Captcha */}
              <div className={`gcl-slide-captcha ${isVerified ? 'verified' : ''}`}>
                <div 
                  className="gcl-slide-fill" 
                  style={{ width: `${sliderValue}%` }}
                ></div>
                <div className="gcl-slide-text">
                  {isVerified ? "Terverifikasi ✓" : "Geser ke kanan untuk verifikasi"}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderValue}
                  onChange={handleSliderChange}
                  onMouseUp={handleSliderRelease}
                  onTouchEnd={handleSliderRelease}
                  className={`gcl-slider-input ${isVerified ? 'verified' : ''}`}
                  disabled={isVerified}
                />
              </div>

              <button type="submit" className="gcl-auth-button modern" disabled={reqLoading}>
                {reqLoading ? "Sending..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default LoginPage;