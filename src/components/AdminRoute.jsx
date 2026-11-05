// src/components/AdminRoute.jsx
//
// Empilement des gardes d'accès aux pages d'administration, dans cet ordre :
//
//   1. ProtectedRoute        -> une session Supabase valide est obligatoire
//   2. RoleGuard             -> la cuisine ne peut PAS ouvrir l'espace admin
//   3. MfaGate               -> si la 2FA est activée sur le compte, la session
//                               doit être vérifiée (aal2) avant d'afficher quoi
//                               que ce soit ; sinon défi de code à 6 chiffres
//   4. SubscriptionProvider  -> résout restaurant + abonnement
//
// Remplace <ProtectedRoute> sur les pages admin qui doivent connaître le statut
// d'abonnement (Dashboard, Settings, History, MenuManager, QRCode).

import ProtectedRoute from './ProtectedRoute';
import RoleGuard from './RoleGuard';
import MfaGate from './MfaGate';
import { SubscriptionProvider } from '../context/SubscriptionProvider';

export default function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <RoleGuard>
        <MfaGate>
          <SubscriptionProvider>
            {children}
          </SubscriptionProvider>
        </MfaGate>
      </RoleGuard>
    </ProtectedRoute>
  );
}
