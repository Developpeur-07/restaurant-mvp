// src/components/StaffRoute.jsx
//
// Calque de AdminRoute.jsx : combine ProtectedRoute (auth existante, inchangée)
// + StaffProvider (nouveau, résout restaurant_id/role via restaurant_staff).
// À utiliser sur les routes cuisine/réception (ex: /kitchen), jamais sur les
// routes propriétaire (Dashboard, Settings...) qui restent sur <AdminRoute>.

import ProtectedRoute from './ProtectedRoute';
import { StaffProvider } from '../context/StaffProvider';

export default function StaffRoute({ children }) {
  return (
    <ProtectedRoute>
      <StaffProvider>
        {children}
      </StaffProvider>
    </ProtectedRoute>
  );
}