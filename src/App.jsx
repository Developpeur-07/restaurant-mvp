import { Routes, Route, Navigate } from 'react-router-dom'
import Menu from './pages/Menu'
import Tracking from './pages/Tracking'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import QRCodePage from './pages/QRCode'

export default function App() {
  return (
    <Routes>
      <Route path="/menu/:restaurantId" element={<Menu />} />
      <Route path="/tracking/:orderId" element={<Tracking />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/qrcode" element={<QRCodePage />} />
     <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  )
}