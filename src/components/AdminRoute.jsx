// src/components/AdminRoute.jsx
//
// Combine ProtectedRoute (auth existante) + SubscriptionProvider (nouveau).
// Remplace <ProtectedRoute> sur les pages admin qui doivent connaître le
// statut d'abonnement (Dashboard, Settings, History, MenuManager, QRCode).

import ProtectedRoute from './ProtectedRoute';
import { SubscriptionProvider } from '../context/SubscriptionProvider';

export default function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </ProtectedRoute>
  );
}