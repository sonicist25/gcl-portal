// src/layouts/GclLayout.jsx
import { useNavigate, useLocation } from "react-router-dom";

export default function GclLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isActive = (target) => {
    if (target === "dashboard") {
      return path === "/" || path === "/dashboard";
    }
    return path === `/${target}`;
  };

  return (
    <div className="gcl-layout">
      {/* Sidebar */}
      <aside className="gcl-sidebar">
        <div className="gcl-sidebar-header">
          <div className="gcl-sidebar-logo-mark">G</div>
          <div className="gcl-sidebar-logo-text">
            <span>Gateway</span>
            <small>Customer Portal</small>
          </div>
        </div>

        <nav className="gcl-sidebar-nav">
          <div className="gcl-nav-section-label">Main</div>

          <button
            className={`gcl-nav-item ${isActive("dashboard") ? "active" : ""}`}
            onClick={() => navigate("/")}
          >
            Dashboard
          </button>

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
            className={`gcl-nav-item ${isActive("quotations") ? "active" : ""}`}
            onClick={() => navigate("/quotations")}
          >
            Quotation
          </button>

          <button
            className={`gcl-nav-item ${isActive("bookings") ? "active" : ""}`}
            onClick={() => navigate("/bookings")}
          >
            Booking
          </button>
          
          <button
            className={`gcl-nav-item ${isActive("trackings") ? "active" : ""}`}
            onClick={() => navigate("/tracking")}
          >
            Tracking
          </button>

          <div className="gcl-nav-section-label">Finance</div>
          <button
            className={`gcl-nav-item ${
              isActive("invoices") ? "active" : ""
            }`}
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

          <button
            className="gcl-nav-item logout"
            onClick={() => {
              localStorage.removeItem("gcl_access_token");
              localStorage.removeItem("gcl_refresh_token");
              localStorage.removeItem("gcl_token_expires");
              localStorage.removeItem("gcl_user");
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* Content */}
      <main className="gcl-main">{children}</main>
    </div>
  );
}
