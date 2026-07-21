// src/hooks/useSubscriptionGate.js
//
// Lu au chargement du dashboard admin restaurant. Détermine si l'accès est
// complet (trial/active) ou dégradé (suspended) — jamais de coupure brutale
// des commandes en cours, seulement des fonctionnalités premium.
//
// Respecte les rules of hooks : tous les hooks (useState/useEffect) sont
// appelés avant tout retour conditionnel dans le composant appelant.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Fonctionnalités bloquées quand subscription_status === 'suspended'.
// Un seul endroit à modifier si la liste évolue.
export const FREE_TIER_LIMITS = {
  realtime: false,
  stats: false,
  customBranding: false,
  customerMobileMoney: false,
  multiStaffAccounts: false,
  maxMenuItems: 20,
};

const FULL_ACCESS = {
  realtime: true,
  stats: true,
  customBranding: true,
  customerMobileMoney: true,
  multiStaffAccounts: true,
  maxMenuItems: Infinity,
};

export function useSubscriptionGate(restaurantId) {
  const [status, setStatus] = useState(undefined); // undefined = en cours de chargement
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    let isMounted = true;

    async function fetchStatus() {
      const { data, error } = await supabase
        .from('restaurants')
        .select('subscription_status, plan, trial_end_at, next_billing_date')
        .eq('id', restaurantId)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error('useSubscriptionGate: erreur lecture statut', error);
        setLoading(false);
        return;
      }

      setStatus(data);
      setLoading(false);
    }

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  const hasFullAccess =
    status?.subscription_status === 'trial' || status?.subscription_status === 'active';

  const features = hasFullAccess ? FULL_ACCESS : FREE_TIER_LIMITS;

  return {
    loading,
    subscriptionStatus: status?.subscription_status,
    plan: status?.plan,
    trialEndAt: status?.trial_end_at,
    nextBillingDate: status?.next_billing_date,
    hasFullAccess,
    features,
  };
}