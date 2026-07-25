// src/context/StaffProvider.jsx
//
// Équivalent de SubscriptionProvider mais pour les comptes cuisine/réception :
// résout restaurant_id + role via restaurant_staff, PAS via restaurants.owner_id
// (un compte staff n'est jamais owner_id d'un restaurant).
// Ne connaît pas le statut d'abonnement — un compte staff n'en a pas besoin.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StaffContext } from './staffContextDef';

export function StaffProvider({ children }) {
  const [staffRow, setStaffRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchStaffRole() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('restaurant_staff')
        .select('restaurant_id, role, restaurants(name, primary_color, secondary_color, logo_url)')
        .eq('user_id', user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error('StaffProvider: erreur lecture restaurant_staff', error);
        setLoading(false);
        return;
      }

      setStaffRow(data);
      setLoading(false);
    }

    fetchStaffRole();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = {
    loading,
    restaurantId: staffRow?.restaurant_id ?? null,
    role: staffRow?.role ?? null,
    restaurantName: staffRow?.restaurants?.name ?? null,
    restaurantBrand: staffRow?.restaurants
      ? {
          primary_color: staffRow.restaurants.primary_color,
          secondary_color: staffRow.restaurants.secondary_color,
          logo_url: staffRow.restaurants.logo_url,
        }
      : null,
  };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}