import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

const API_LOGIN_URL = "https://gateway-cl.com/api/Customer_login/login"; 

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Data fitur yang di-mapping ke gambar di folder public
  const features = [
    { title: "Shipping Schedule", image: "/Schedules.jpg" },
    { title: "Shipping Rates", image: "/Rates.jpg" },
    { title: "Quotations", image: "/Quotations.jpg" },
    { title: "Booking Online", image: "/Online Booking.jpg" },
    { title: "Shipment List", image: "/Shipment List.jpg" },
    { title: "Tracking Cargo", image: "/Tracking.jpg" },
    { title: "Invoice & Tax", image: "/Invoice & Tax.jpg" },
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

  const handleRequestAccess = () => {
    alert("Mengarahkan ke form pengajuan Username & Password...");
    // navigate("/request-access");
  };

  return (
    <div className="gcl-auth-wrapper">
      
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
              style={{ backgroundImage: `url("${feat.image}")` }}
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
              style={{ backgroundImage: `url("${feat.image}")` }}
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
              style={{ backgroundImage: `url("${feat.image}")` }}
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

    </div>
  );
}

export default LoginPage;