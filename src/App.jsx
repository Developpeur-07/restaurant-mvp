import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu";
import Tracking from "./pages/Tracking";
import Login from "./pages/Login";
import AdminRoute from "./components/AdminRoute";
import StaffRoute from "./components/StaffRoute";
import SuperAdminRoute from './components/SuperAdminRoute';

// Lazy loading des pages lourdes/admin pour un chargement client ultra-rapide
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MenuManager = lazy(() => import("./pages/MenuManager"));
const Settings = lazy(() => import("./pages/Settings"));
const History = lazy(() => import("./pages/History"));
const QRCodePage = lazy(() => import("./pages/QRCode"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const HomePage = lazy(() => import('./pages/HomePage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const AdminInvite = lazy(() => import("./pages/AdminInvite"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const StaffOnboarding = lazy(() => import("./pages/StaffOnboarding"));

const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F2A44', color: '#fff', fontFamily: 'Georgia, serif' }}>
    <p>Chargement...</p>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/menu/:restaurantId" element={<Menu />} />
        <Route path="/menu/:restaurantId/:category" element={<Menu />} />
        <Route path="/tracking/:orderId" element={<Tracking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/:token" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
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

        <Route path="/staff-onboarding/:token" element={<StaffOnboarding />} />
        <Route
          path="/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdmin />
            </SuperAdminRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}