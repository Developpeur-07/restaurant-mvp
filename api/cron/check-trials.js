// api/cron/check-trials.js
//
// Cron Vercel quotidien (voir vercel.json — 03h00 UTC).
// Vercel envoie automatiquement `Authorization: Bearer ${CRON_SECRET}` sur les
// invocations cron — CRON_SECRET est auto-provisionné dans les env vars du
// projet, rien à configurer manuellement.
//
// Logique :
//  1. Restaurants en `trial` dont `trial_end_at` est dépassé ET sans paiement
//     `success` associé → bascule `suspended` / `free`.
//     (on vérifie toujours subscription_payments en dernier ressort — jamais
//     de suspension sur la seule base de trial_end_at, pour éviter la course
//     avec un webhook arrivé à la dernière minute)
//  2. Restaurants à J-3 de `trial_end_at` → génération du lien de paiement
//     (stub pour l'instant, branché réellement en Phase 2).

import { createClient } from '@supabase/supabase-js';
import {process} from 'process';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // clé service_role, bypass RLS — jamais exposée côté client
);

export default async function handler(req, res) {
  // Sécurité : seul Vercel (avec le bon secret) peut déclencher cette route
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const results = { suspended: [], reminded: [], errors: [] };

  try {
    // ---------------------------------------------------------------
    // 1. Restaurants dont l'essai est terminé
    // ---------------------------------------------------------------
    const { data: expiredTrials, error: expiredError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, trial_end_at, subscription_status')
      .eq('subscription_status', 'trial')
      .lte('trial_end_at', now.toISOString());

    if (expiredError) throw expiredError;

    for (const restaurant of expiredTrials ?? []) {
      // Vérification en dernier ressort : un paiement confirmé existe-t-il déjà ?
      const { data: successPayment, error: paymentError } = await supabaseAdmin
        .from('subscription_payments')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'success')
        .limit(1)
        .maybeSingle();

      if (paymentError) {
        results.errors.push({ restaurant_id: restaurant.id, error: paymentError.message });
        continue;
      }

      if (successPayment) {
        // Paiement trouvé mais statut pas encore mis à jour (webhook en retard) :
        // on corrige nous-mêmes plutôt que de suspendre à tort.
        await supabaseAdmin
          .from('restaurants')
          .update({ subscription_status: 'active' })
          .eq('id', restaurant.id);

        await supabaseAdmin.rpc('log_subscription_transition', {
          p_restaurant_id: restaurant.id,
          p_previous_status: 'trial',
          p_new_status: 'active',
          p_triggered_by: 'cron',
          p_reason: 'Paiement success trouvé en base lors du check-trials, statut corrigé automatiquement',
        });
        continue;
      }

      // Aucun paiement confirmé → suspension
      await supabaseAdmin
        .from('restaurants')
        .update({ subscription_status: 'suspended', plan: 'free' })
        .eq('id', restaurant.id);

      await supabaseAdmin.rpc('log_subscription_transition', {
        p_restaurant_id: restaurant.id,
        p_previous_status: 'trial',
        p_new_status: 'suspended',
        p_triggered_by: 'cron',
        p_reason: 'trial_end_at dépassé, aucun paiement success trouvé',
      });

      results.suspended.push(restaurant.id);
    }

    // ---------------------------------------------------------------
    // 2. Restaurants à J-3 de la fin d'essai → relance paiement
    // ---------------------------------------------------------------
    const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: upcomingTrials, error: upcomingError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, trial_end_at')
      .eq('subscription_status', 'trial')
      .gt('trial_end_at', in2Days.toISOString())
      .lte('trial_end_at', in3Days.toISOString());

    if (upcomingError) throw upcomingError;

    for (const restaurant of upcomingTrials ?? []) {
      // TODO Phase 2 : remplacer par l'appel réel à /api/generate-payment-link
      // (génération lien CinetPay + envoi WhatsApp/email). Pour l'instant,
      // on se contente de logger pour valider la détection J-3 sans argent réel.
      results.reminded.push(restaurant.id);
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('check-trials cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}