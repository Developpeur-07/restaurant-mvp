import { Routes, Route, Navigate } from 'react-router-dom'
import Menu from './pages/Menu'
import Tracking from './pages/Tracking'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import QRCodePage from './pages/QRCode'
import UpdatePassword from './pages/UpdatePassword'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/menu/b0b0b0b0-0000-0000-0000-000000000001" />} />
      <Route path="/menu/:restaurantId" element={<Menu />} />
      <Route path="/tracking/:orderId" element={<Tracking />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/qrcode" element={<QRCodePage />} />
    </Routes>
  )
}