// src/context/SubscriptionProvider.jsx
//
// Ne contient que le composant Provider — respecte la règle react-refresh
// "un fichier .jsx = uniquement des composants".

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SubscriptionContext } from './subscriptionContextDef';

const FREE_TIER_LIMITS = {
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

export function SubscriptionProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchRestaurantSubscription() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, plan, subscription_status, trial_end_at, next_billing_date')
        .eq('owner_id', user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error('SubscriptionProvider: erreur lecture restaurant', error);
        setLoading(false);
        return;
      }

      setRestaurant(data);
      setLoading(false);
    }

    fetchRestaurantSubscription();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasFullAccess =
    restaurant?.subscription_status === 'trial' || restaurant?.subscription_status === 'active';

  const value = {
    loading,
    restaurantId: restaurant?.id ?? null,
    restaurantName: restaurant?.name ?? null,
    subscriptionStatus: restaurant?.subscription_status,
    plan: restaurant?.plan,
    trialEndAt: restaurant?.trial_end_at,
    nextBillingDate: restaurant?.next_billing_date,
    hasFullAccess,
    features: hasFullAccess ? FULL_ACCESS : FREE_TIER_LIMITS,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}