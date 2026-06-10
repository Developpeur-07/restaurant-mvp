import { Routes, Route } from 'react-router-dom'
import Menu from './pages/Menu'

export default function App() {
  return (
    <Routes>
      <Route path="/menu/:restaurantId" element={<Menu />} />
    </Routes>
  )
}