import { Routes, Route, Navigate } from "react-router-dom";
import Menu from "./pages/Menu";
import Tracking from "./pages/Tracking";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import QRCodePage from "./pages/QRCode";
import UpdatePassword from "./pages/UpdatePassword";
import AdminRoute from "./components/AdminRoute";
import Settings from "./pages/Settings";
import History from "./pages/History";
import MenuManager from "./pages/MenuManager";
import AdminInvite from "./pages/AdminInvite";
import Onboarding from "./pages/Onboarding";
import StaffRoute from "./components/StaffRoute";
import Kitchen from "./pages/Kitchen";

import SuperAdminRoute from './components/SuperAdminRoute'


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
          <AdminRoute>
            <Dashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/qrcode"
        element={
          <AdminRoute>
            <QRCodePage />
          </AdminRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminRoute>
            <Settings />
          </AdminRoute>
        }
      />
      <Route
        path="/history"
        element={
          <AdminRoute>
            <History />
          </AdminRoute>
        }
      />
      <Route
        path="/menu-manager"
        element={
          <AdminRoute>
            <MenuManager />
          </AdminRoute>
        }
      />

      <Route
        path="/kitchen"
        element={
          <StaffRoute>
            <Kitchen />
          </StaffRoute>
        }
      />
      
      <Route path="/onboarding/:token" element={<Onboarding />} />
      <Route path="/admin-invite" element={
        <SuperAdminRoute><AdminInvite /></SuperAdminRoute>
      } />

    </Routes>
  );
}