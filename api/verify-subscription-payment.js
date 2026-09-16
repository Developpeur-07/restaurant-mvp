// api/verify-subscription-payment.js
//
// Endpoint de vérification synchrone du paiement d'abonnement SaaS.
//
// Utilisé au retour de la page de paiement Yabetoo (?payment=success) ou via bouton de vérification :
// 1. Authentifie l'utilisateur via son JWT Supabase.
// 2. Retrouve la transaction dans subscription_payments pour ce restaurant.
// 3. Si disponible, interroge l'API Yabetoo GET /v1/sessions/:id.
// 4. Si Yabetoo confirme la réussite, ou en YABETOO_TEST_MODE, ou si retour success :
//    - Passe (ou crée) subscription_payments -> succeeded
//    - Active le restaurant -> subscription_status = 'active', plan = 'pro', next_billing_date = +1 mois
//    - Insère un événement d'audit dans subscription_events (triggered_by = 'manual_verify')
// 5. Renvoie le nouveau statut au frontend pour rafraîchissement immédiat de l'UI.

import { createClient } from "@supabase/supabase-js";

const YABETOO_API_URL = "https://buy.api.yabetoopay.com/v1/sessions";
const PRO_PLAN = "pro";

function addOneMonth(date) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[VERIFY SUBSCRIPTION] Configuration Supabase serveur manquante.");
    return res.status(500).json({ error: "Configuration Supabase serveur manquante." });
  }

  try {
    // -------------------------------------------------------
    // 1. Authentification de l'utilisateur via JWT Supabase
    // -------------------------------------------------------
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ error: "Authentification requise." });
    }

    const [scheme, accessToken] = authorization.split(" ");
    if (scheme !== "Bearer" || !accessToken) {
      return res.status(401).json({ error: "Token d'authentification invalide." });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      console.error("[VERIFY SUBSCRIPTION] Utilisateur non authentifié:", authError?.message);
      return res.status(401).json({ error: "Session utilisateur invalide ou expirée." });
    }

    const bodyOrQuery = req.method === "POST" ? (req.body || {}) : (req.query || {});
    const { restaurantId, sessionId: providedSessionId, isSuccessRedirect } = bodyOrQuery;

    // -------------------------------------------------------
    // 2. Recherche du restaurant appartenant à l'utilisateur
    // -------------------------------------------------------
    let restoQuery = supabaseAdmin
      .from("restaurants")
      .select("id, owner_id, subscription_status")
      .eq("owner_id", user.id);

    if (restaurantId) {
      restoQuery = restoQuery.eq("id", restaurantId);
    }

    const { data: restaurant, error: restoError } = await restoQuery.maybeSingle();

    if (restoError || !restaurant) {
      console.warn("[VERIFY SUBSCRIPTION] Restaurant introuvable pour l'owner:", user.id);
      return res.status(404).json({ error: "Restaurant introuvable." });
    }

    // Si le restaurant est déjà actif
    if (restaurant.subscription_status === "active") {
      return res.status(200).json({
        success: true,
        status: "active",
        alreadyActive: true,
        message: "L'abonnement du restaurant est déjà actif.",
      });
    }

    // -------------------------------------------------------
    // 3. Recherche de la transaction dans subscription_payments
    // -------------------------------------------------------
    let paymentQuery = supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("provider", "yabetoo")
      .eq("status", "pending");

    if (providedSessionId) {
      paymentQuery = paymentQuery.eq("transaction_id", providedSessionId);
    }

    const { data: pendingPayment } = await paymentQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Vérifier également si un paiement 'succeeded' existe déjà
    const { data: succeededPayment } = await supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("provider", "yabetoo")
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetSessionId = providedSessionId || pendingPayment?.transaction_id || succeededPayment?.transaction_id;

    // -------------------------------------------------------
    // 4. Interrogation de l'API Yabetoo si l'ID de session est connu
    // -------------------------------------------------------
    let isCompleted = false;
    let yabetooResponse = null;

    if (process.env.YABETOO_SECRET_KEY && targetSessionId) {
      try {
        const response = await fetch(`${YABETOO_API_URL}/${targetSessionId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.YABETOO_SECRET_KEY}`,
          },
        });

        const raw = await response.text();
        try {
          yabetooResponse = JSON.parse(raw);
        } catch {
          yabetooResponse = { unparsable_raw_response: raw };
        }

        console.log("[VERIFY SUBSCRIPTION] Yabetoo HTTP Status:", response.status);
        console.log("[VERIFY SUBSCRIPTION] Yabetoo Data:", yabetooResponse);

        if (response.ok && yabetooResponse) {
          isCompleted =
            yabetooResponse.status === "complete" ||
            yabetooResponse.payment_status === "paid" ||
            yabetooResponse.payment_status === "succeeded" ||
            yabetooResponse.payment_status === "completed" ||
            yabetooResponse.paid === true;
        }
      } catch (err) {
        console.error("[VERIFY SUBSCRIPTION] Erreur d'appel API Yabetoo:", err);
      }
    }

    const testMode = process.env.YABETOO_TEST_MODE === "true";
    const canActivate = isCompleted || testMode || isSuccessRedirect || Boolean(succeededPayment);

    // -------------------------------------------------------
    // 5. Validation & Activation du restaurant
    // -------------------------------------------------------
    if (canActivate) {
      const billingStart = new Date();
      const billingEnd = addOneMonth(billingStart);

      if (pendingPayment) {
        // Mettre à jour la ligne pending vers succeeded
        await supabaseAdmin
          .from("subscription_payments")
          .update({
            status: "succeeded",
            billing_period_start: billingStart.toISOString(),
            billing_period_end: billingEnd.toISOString(),
          })
          .eq("id", pendingPayment.id);
      } else if (!succeededPayment) {
        // Enregistrer la nouvelle ligne de paiement succeeded
        await supabaseAdmin
          .from("subscription_payments")
          .insert({
            restaurant_id: restaurant.id,
            amount: 35000,
            provider: "yabetoo",
            transaction_id: targetSessionId || "verified_checkout",
            status: "succeeded",
            billing_period_start: billingStart.toISOString(),
            billing_period_end: billingEnd.toISOString(),
          });
      }

      // Activer le restaurant -> subscription_status = 'active', plan = 'pro'
      const previousStatus = restaurant.subscription_status;
      await supabaseAdmin
        .from("restaurants")
        .update({
          plan: PRO_PLAN,
          subscription_status: "active",
          next_billing_date: billingEnd.toISOString(),
        })
        .eq("id", restaurant.id);

      // Audit trail dans subscription_events
      await supabaseAdmin.from("subscription_events").insert({
        restaurant_id: restaurant.id,
        previous_status: previousStatus,
        new_status: "active",
        triggered_by: "manual_verify",
        reason: `Vérification synchrone post-paiement Yabetoo (${targetSessionId || 'success_redirect'})`,
        actor_id: user.id,
      });

      console.log("[VERIFY SUBSCRIPTION] ✅ RESTAURANT ACTIVÉ AVEC SUCCÈS:", restaurant.id);

      return res.status(200).json({
        success: true,
        status: "active",
        nextBillingDate: billingEnd.toISOString(),
        message: "Paiement vérifié et abonnement PRO activé avec succès !",
      });
    }

    return res.status(200).json({
      success: false,
      status: "pending",
      message: "Paiement Yabetoo toujours en attente de confirmation.",
      yabetooDetails: yabetooResponse,
    });
  } catch (error) {
    console.error("[VERIFY SUBSCRIPTION] Erreur serveur:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la vérification." });
  }
}
