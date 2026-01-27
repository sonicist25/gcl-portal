import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_LOGIN_URL = "https://gateway-cl.com/api/Customer_login/login"; 
// ⬆️ GANTI dengan URL endpoint login kamu yang sebenarnya

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

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
        // SESUAIKAN dengan API kamu:
        // kalau API pakai "email", ganti email: username
        shipper_id: username,
        password: password,
      }),
    });

    const data = await res.json();
    console.log("Status HTTP:", res.status);
    console.log("Data:", data);

    // 1) Kalau HTTP status bukan 200
    if (!res.ok) {
      throw new Error(data.message || `Login gagal (HTTP ${res.status})`);
    }

    // 2) Kalau API balas status=false
    if (!data.status) {
      throw new Error(data.message || "Login gagal (status=false).");
    }

    // 3) Simpan token & expiry
    localStorage.setItem("gcl_access_token", data.access_token);
    localStorage.setItem("gcl_refresh_token", data.refresh_token || "");
    localStorage.setItem(
      "gcl_token_expires",
      String(Date.now() + (data.expires_in || 0) * 1000)
    );

    // 4) Decode JWT untuk ambil data shipper
    try {
      const parts = data.access_token.split(".");
      if (parts.length === 3) {
        const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        const user = payload.data || null; // {id_shipper, shipper_name, region_id}

        if (user) {
          localStorage.setItem("gcl_user", JSON.stringify(user));
        }
        // TAMBAH: simpan id shipper
        if (user && user.id_shipper) {
          localStorage.setItem("gcl_shipper_id", user.id_shipper);
        }
      }
    } catch (err) {
      console.warn("Gagal decode JWT:", err);
    }

    // 5) Redirect ke dashboard
    navigate("/dashboard");
  } catch (err) {
    console.error(err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="gcl-auth-bg">
      <div className="gcl-auth-overlay">
        <div className="gcl-auth-card">
          <div className="gcl-auth-logo">
            <span className="gcl-logo-mark">G</span>
            <div className="gcl-logo-text">
              <span className="gcl-logo-main">Gateway</span>
              <span className="gcl-logo-sub">Container Line</span>
            </div>
          </div>

          <h1 className="gcl-auth-title">Sign In</h1>
          <p className="gcl-auth-subtitle">Customer Portal • Gateway Group</p>

          {error && <div className="gcl-auth-alert error">{error}</div>}

          <form onSubmit={handleSubmit} className="gcl-auth-form">
            <div className="gcl-form-group">
              <label htmlFor="username">User ID</label>
              <input
                id="username"
                type="text"
                placeholder="User ID / Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="gcl-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="gcl-auth-button" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            <div className="gcl-auth-footer">
              <span>© {new Date().getFullYear()} Gateway Group</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
