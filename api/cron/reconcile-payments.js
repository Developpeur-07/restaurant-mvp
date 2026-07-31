// Réconciliation horaire des paiements CinetPay en attente.
// Corrige les cas où le webhook s'est perdu mais où le paiement a
// réussi côté CinetPay — sans jamais faire confiance à la seule
// présence en base (toujours revérifier côté fournisseur).
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
      // ── TODO Phase 2 : remplacer par le vrai appel API CinetPay ──
      // (bloqué tant que le compte marchand CinetPay n'est pas ouvert,
      // cf. COMMITS.md). Le contrat attendu : renvoyer 'success' | 'failed' | 'pending'.
      const cinetpayStatus = await checkCinetPayStatus(payment.transaction_id);

      if (cinetpayStatus === 'success') {
        // Idempotence : la contrainte UNIQUE sur transaction_id empêche
        // un double traitement même si ce job tourne deux fois en parallèle.
        const { error: updateError } = await supabase
          .from('subscription_payments')
          .update({ status: 'confirmed' })
          .eq('id', payment.id)
          .eq('status', 'pending'); // évite d'écraser un état déjà changé entre-temps

        if (updateError) throw updateError;

        await supabase.from('restaurants')
          .update({ subscription_status: 'active' })
          .eq('id', payment.restaurant_id);

        await supabase.from('subscription_events').insert({
          restaurant_id: payment.restaurant_id,
          triggered_by: 'cron',
          reason: `Réconciliation : paiement ${payment.transaction_id} confirmé côté CinetPay, webhook manquant`,
        });

        results.corrected++;
      } else if (cinetpayStatus === 'failed') {
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

// Placeholder — à remplacer par le vrai appel API CinetPay en Phase 2.
async function checkCinetPayStatus(transactionId) {
  console.warn(`checkCinetPayStatus non implémenté (Phase 2 en pause) — transaction ${transactionId}`);
  return 'pending';
}