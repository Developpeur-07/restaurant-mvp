// src/hooks/useSubscription.js
//
// Hook isolé dans son propre fichier — utilisez-le dans n'importe quelle
// page admin enveloppée par <AdminRoute> :
//
//   import { useSubscription } from '../hooks/useSubscription';
//   const { features, hasFullAccess, subscriptionStatus } = useSubscription();

import { useContext } from 'react';
import { SubscriptionContext } from '../context/subscriptionContextDef';

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription doit être utilisé à l'intérieur de <SubscriptionProvider>");
  }
  return context;
}