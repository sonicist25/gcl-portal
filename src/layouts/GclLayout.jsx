import { useNavigate, useLocation } from "react-router-dom";

export default function GclLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Deteksi apakah user sudah login dengan mengecek token di localStorage
  const isLoggedIn = !!localStorage.getItem("gcl_access_token");

  const isActive = (target) => {
    if (target === "dashboard") {
      return path === "/" || path === "/dashboard";
    }
    return path.startsWith(`/${target}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("gcl_access_token");
    localStorage.removeItem("gcl_refresh_token");
    localStorage.removeItem("gcl_token_expires");
    localStorage.removeItem("gcl_user");
    window.location.href = "/login";
  };

  return (
    <div className="gcl-layout">
      {/* Sidebar Vertikal Cerdas */}
      <aside className="gcl-sidebar">
        <div className="gcl-sidebar-header">
          <img src={`${import.meta.env.BASE_URL}minilogo.png`} alt="Gateway Logo" className="gcl-sidebar-logo-img" />
          <div className="gcl-sidebar-logo-text">
            <span>Gateway</span>
            <small>Customer Portal</small>
          </div>
        </div>

        <nav className="gcl-sidebar-nav">
          
          {/* MENU PUBLIK (Selalu Tampil) */}
          <div className="gcl-nav-section-label">E-Services</div>
          
          <button
            className={`gcl-nav-item ${isActive("schedule") ? "active" : ""}`}
            onClick={() => navigate("/schedule")}
          >
            Ship Schedule
          </button>

          <button
            className={`gcl-nav-item ${isActive("rates") ? "active" : ""}`}
            onClick={() => navigate("/rates")}
          >
            Rates / Tariff
          </button>

          <button
            className={`gcl-nav-item ${isActive("tracking") ? "active" : ""}`}
            onClick={() => navigate("/tracking")}
          >
            Tracking Cargo
          </button>

          {/* MENU PRIVAT (Hanya Tampil Jika Login) */}
          {isLoggedIn ? (
            <>
              <div className="gcl-nav-section-label">Main Menu</div>
              <button
                className={`gcl-nav-item ${isActive("dashboard") ? "active" : ""}`}
                onClick={() => navigate("/")}
              >
                Dashboard
              </button>
              <button
                className={`gcl-nav-item ${isActive("quotations") ? "active" : ""}`}
                onClick={() => navigate("/quotations")}
              >
                Quotation
              </button>
              <button
                className={`gcl-nav-item ${isActive("bookings") ? "active" : ""}`}
                onClick={() => navigate("/bookings")}
              >
                Booking List
              </button>

              <div className="gcl-nav-section-label">Finance</div>
              <button
                className={`gcl-nav-item ${isActive("invoices") ? "active" : ""}`}
                onClick={() => navigate("/invoices")}
              >
                Invoices &amp; e-Faktur
              </button>

              <div className="gcl-nav-section-label">Account</div>
              <button
                className={`gcl-nav-item ${isActive("profile") ? "active" : ""}`}
                onClick={() => navigate("/profile")}
              >
                Profile
              </button>
              <button className="gcl-nav-item logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            /* TOMBOL LOGIN JIKA BELUM LOGIN */
            <>
              <div className="gcl-nav-section-label" style={{ marginTop: '2rem' }}>Customer Portal</div>
              <button
                className="gcl-nav-item"
                style={{
                  background: '#0056b3', /* Biru Gateway */
                  color: '#ffffff',
                  justifyContent: 'center',
                  fontWeight: '600',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 10px rgba(0, 86, 179, 0.4)'
                }}
                onClick={() => navigate("/login")}
              >
                Sign In / Login
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Content */}
      <main 
        className="gcl-main" 
        style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", minHeight: 0, overflow: "hidden", background: "transparent" }}
      >
        {children}
      </main>
    </div>
  );
}