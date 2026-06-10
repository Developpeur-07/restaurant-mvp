import { Routes, Route, Navigate } from 'react-router-dom'
import Menu from './pages/Menu'

export default function App() {
  return (
    <Routes>
      <Route path="/menu/:restaurantId" element={<Menu />} />
      <Route path="/" element={<Navigate to="/menu/a1b2c3d4-0000-0000-0000-000000000001" />} />
    </Routes>
  )
}