// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SchedulePage from "./pages/SchedulePage";
import RatesPage from "./pages/RatesPage";
import QuotationList from "./pages/QuotationList";
import QuotationDetail from "./pages/QuotationDetail";
import BookingPage from "./pages/BookingPage";
import InvoiceList from "./pages/InvoiceList";
import GocometTracking from "./pages/GocometTracking"; 

function RequireAuth({ children }) {
  const token = localStorage.getItem("gcl_access_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==========================================
            RUTE PUBLIK (Bisa diakses TANPA Login)
            ========================================== */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Lepas bungkus <RequireAuth> di 3 halaman ini */}
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/tracking" element={<GocometTracking />} />

        {/* ==========================================
            RUTE PRIVAT (Wajib Login)
            ========================================== */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/quotations"
          element={
            <RequireAuth>
              <QuotationList />
            </RequireAuth>
          }
        />

        <Route
          path="/quotations/:id"
          element={
            <RequireAuth>
              <QuotationDetail />
            </RequireAuth>
          }
        />

        <Route
          path="/bookings"
          element={
            <RequireAuth>
              <BookingPage />
            </RequireAuth>
          }
        />

        <Route
          path="/invoices"
          element={
            <RequireAuth>
              <InvoiceList />
            </RequireAuth>
          }
        />

        {/* Redirect default */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;