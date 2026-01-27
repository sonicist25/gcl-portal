// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SchedulePage from "./pages/SchedulePage";
import RatesPage from "./pages/RatesPage";
import QuotationList from "./pages/QuotationList";
import QuotationDetail from "./pages/QuotationDetail";
import BookingPage from "./pages/BookingPage";
import GocometTracking from "./pages/GocometTracking";
import InvoiceList from "./pages/InvoiceList";

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
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/schedule"
          element={
            <RequireAuth>
              <SchedulePage />
            </RequireAuth>
          }
        />

        <Route
          path="/rates"
          element={
            <RequireAuth>
              <RatesPage />
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
          path="/quotations/:name"
          element={
            <RequireAuth>
              <QuotationDetail />
            </RequireAuth>
          }
        />

        {/* NEW: bookings */}
        <Route
          path="/bookings"
          element={
            <RequireAuth>
              <BookingPage />
            </RequireAuth>
          }
        />

        <Route
        path="/trackings"
        element={
          <RequireAuth>
            <GocometTracking />
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

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
