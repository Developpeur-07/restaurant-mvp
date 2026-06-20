import { Routes, Route, Navigate } from "react-router-dom";
import Menu from "./pages/Menu";
import Tracking from "./pages/Tracking";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import QRCodePage from "./pages/QRCode";
import UpdatePassword from "./pages/UpdatePassword";
import ProtectedRoute from "./components/ProtectedRoute";
import Settings from "./pages/Settings";
import History from "./pages/History";
import MenuManager from "./pages/MenuManager";
import AdminInvite from "./pages/AdminInvite";
import Onboarding from "./pages/Onboarding";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/menu/b0b0b0b0-0000-0000-0000-000000000001" />}
      />
      <Route path="/menu/:restaurantId" element={<Menu />} />
      <Route path="/menu/:restaurantId/:category" element={<Menu />} />
      <Route path="/tracking/:orderId" element={<Tracking />} />
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qrcode"
        element={
          <ProtectedRoute>
            <QRCodePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu-manager"
        element={
          <ProtectedRoute>
            <MenuManager />
          </ProtectedRoute>
        }
      />
      <Route path="/admin-invite" element={
        <ProtectedRoute><AdminInvite /></ProtectedRoute>
      } />
      <Route path="/onboarding/:token" element={<Onboarding />} />
    </Routes>
  );
}
