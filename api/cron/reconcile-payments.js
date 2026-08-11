// api/cron/reconcile-payments.js
//
// Réconciliation horaire des paiements Yabetoo en attente.
//
// Corrige les cas où le webhook s'est perdu mais où le paiement a
// réussi côté Yabetoo — sans jamais faire confiance à la seule
// présence en base (toujours revérifier côté fournisseur).
//
// IMPORTANT (11 août 2026) :
// CinetPay est figé (Phase 5bis, bloqué faute de RCCM). Tout le flux
// B2B tourne désormais sur Yabetoo. Ce fichier a été réorienté en
// conséquence — ne pas réintroduire de logique CinetPay ici.
//
// Statuts et champs alignés sur api/webhooks/yabetoo-debug.js :
// - subscription_payments.status = 'succeeded' (pas 'confirmed')
// - activation restaurant complète : plan, subscription_status,
//   next_billing_date (le webhook fait les 3, ce cron doit faire pareil
//   pour ne pas laisser un restaurant "actif" sans prochaine échéance)
// - subscription_events.triggered_by = 'cron' (contrainte CHECK en base :
//   subscription_events_triggered_by_check limite à 'webhook'|'cron'|'manual')
//
// Point de vigilance non résolu : l'endpoint de vérification serveur-à-serveur
// Yabetoo n'est pas encore confirmé (401 rencontré sur GET /v1/sessions/:id,
// cf. échange avec support@yabetoopay.com). checkYabetooStatus() reste donc
// un placeholder qui renvoie toujours 'pending' tant que le contrat exact de
// l'API de vérification n'est pas clarifié — préférable à un faux 'success'.

export default async function handler(req, res) {
  // Protection : seul un appelant connaissant le secret peut déclencher
  // cette route (GitHub Actions l'enverra en header).
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // clé service, pas anon — bypass RLS pour ce job serveur
  );

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: pendingPayments, error: fetchError } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('provider', 'yabetoo')
    .eq('status', 'pending')
    .lt('created_at', fifteenMinutesAgo);

  if (fetchError) {
    console.error('Erreur lecture subscription_payments', fetchError);
    return res.status(500).json({ error: fetchError.message });
  }

  const results = { checked: 0, corrected: 0, stillPending: 0, errors: 0 };

  for (const payment of pendingPayments || []) {
    results.checked++;
    try {
      // ── Placeholder tant que l'endpoint de vérification Yabetoo n'est
      // pas confirmé. Contrat attendu : renvoyer 'success' | 'failed' | 'pending'.
      const yabetooStatus = await checkYabetooStatus(payment.transaction_id);

      if (yabetooStatus === 'success') {
        // Idempotence : le filtre .eq('status', 'pending') empêche un
        // double traitement même si ce job tourne deux fois en parallèle.
        const { data: updatedPayment, error: updateError } = await supabase
          .from('subscription_payments')
          .update({
            status: 'succeeded',
            billing_period_start: new Date().toISOString(),
            billing_period_end: addOneMonth(new Date()).toISOString(),
          })
          .eq('id', payment.id)
          .eq('status', 'pending')
          .select()
          .maybeSingle();

        if (updateError) throw updateError;

        // Un autre process (webhook ou une exécution parallèle de ce cron)
        // a pu déjà traiter ce paiement entre le fetch et l'update.
        if (!updatedPayment) {
          results.stillPending++;
          continue;
        }

        const { data: restaurant, error: restaurantFetchError } = await supabase
          .from('restaurants')
          .select('id, owner_id, subscription_status')
          .eq('id', payment.restaurant_id)
          .maybeSingle();

        if (restaurantFetchError) throw restaurantFetchError;

        const previousStatus = restaurant?.subscription_status || null;
        const nextBillingDate = updatedPayment.billing_period_end;

        const { error: restaurantUpdateError } = await supabase
          .from('restaurants')
          .update({
            plan: 'pro',
            subscription_status: 'active',
            next_billing_date: nextBillingDate,
          })
          .eq('id', payment.restaurant_id);

        if (restaurantUpdateError) throw restaurantUpdateError;

        const { error: eventInsertError } = await supabase
          .from('subscription_events')
          .insert({
            restaurant_id: payment.restaurant_id,
            previous_status: previousStatus,
            new_status: 'active',
            triggered_by: 'cron',
            reason: `Réconciliation : paiement ${payment.transaction_id} confirmé côté Yabetoo, webhook manquant`,
            actor_id: restaurant?.owner_id || null,
          });

        if (eventInsertError) {
          // Le paiement et l'abonnement sont déjà corrigés — ne pas
          // annuler à cause d'un échec d'écriture de l'audit trail.
          console.error(
            `Paiement ${payment.id} corrigé mais historique non enregistré`,
            eventInsertError
          );
        }

        results.corrected++;
      } else if (yabetooStatus === 'failed') {
        await supabase
          .from('subscription_payments')
          .update({ status: 'failed' })
          .eq('id', payment.id)
          .eq('status', 'pending');
        results.errors++;
      } else {
        results.stillPending++;
      }
    } catch (err) {
      console.error(`Erreur réconciliation paiement ${payment.id}`, err);
      results.errors++;
    }
  }

  return res.status(200).json(results);
}

function addOneMonth(date) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

// Placeholder — à remplacer une fois le contrat exact de l'API de
// vérification Yabetoo confirmé (cf. échange en cours avec
// support@yabetoopay.com sur le 401 rencontré côté GET /v1/sessions/:id).
async function checkYabetooStatus(transactionId) {
  console.warn(
    `checkYabetooStatus non implémenté (endpoint de vérification Yabetoo non confirmé) — transaction ${transactionId}`
  );
  return 'pending';
}