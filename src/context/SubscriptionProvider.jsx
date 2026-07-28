// src/context/SubscriptionProvider.jsx
//
// Ne contient que le composant Provider — respecte la règle react-refresh
// "un fichier .jsx = uniquement des composants".
//
// Résout le restaurant selon deux chemins possibles :
//   1. owner_id = auth.uid()            -> compte propriétaire
//   2. restaurant_staff, role=reception -> compte réception (repli)
// Source unique pour Dashboard.jsx : plus de requête séparée côté page,
// tout (restaurant, marque, abonnement) vient d'ici.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SubscriptionContext } from './subscriptionContextDef';

const RESTAURANT_FIELDS = 'id, name, plan, subscription_status, trial_end_at, next_billing_date, primary_color, secondary_color, logo_url';

export function SubscriptionProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchRestaurantSubscription() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      // ── Chemin 1 : propriétaire ──
      const { data: ownerResto, error: ownerError } = await supabase
        .from('restaurants')
        .select(RESTAURANT_FIELDS)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownerError) {
        console.error('SubscriptionProvider: erreur lecture restaurant (owner)', ownerError);
        if (isMounted) setLoading(false);
        return;
      }

      if (ownerResto) {
        if (!isMounted) return;
        setRestaurant(ownerResto);
        setIsOwner(true);
        setLoading(false);
        return;
      }

      // ── Chemin 2 : compte réception (repli) ──
      const { data: staffRow, error: staffError } = await supabase
        .from('restaurant_staff')
        .select(`role, restaurants (${RESTAURANT_FIELDS})`)
        .eq('user_id', user.id)
        .eq('role', 'reception')
        .maybeSingle();

      if (!isMounted) return;

      if (staffError) {
        console.error('SubscriptionProvider: erreur lecture restaurant (staff)', staffError);
        setLoading(false);
        return;
      }

      if (staffRow?.restaurants) {
        setRestaurant(staffRow.restaurants);
        setIsOwner(false);
      }
      // Sinon : ni propriétaire ni réception (ex: compte cuisine testant
      // /dashboard) — restaurant reste null, Dashboard.jsx affiche
      // "pas d'accès" au lieu de rester bloqué indéfiniment.

      setLoading(false);
    }

    fetchRestaurantSubscription();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasFullAccess =
    restaurant?.subscription_status === 'trial' || restaurant?.subscription_status === 'active';

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

  const value = {
    loading,
    isOwner,
    restaurantId: restaurant?.id ?? null,
    restaurantName: restaurant?.name ?? null,
    restaurantBrand: restaurant
      ? {
          primary_color: restaurant.primary_color,
          secondary_color: restaurant.secondary_color,
          logo_url: restaurant.logo_url,
        }
      : null,
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