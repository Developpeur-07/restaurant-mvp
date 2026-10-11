-- Migration 020: Ajouts ciblés et bonnes pratiques PostgreSQL / Supabase
-- Script idempotent à exécuter dans le Supabase SQL Editor
-- Date: 2026-10-11

-- ==============================================================================
-- 1. TABLE PAYMENTS : Prise en charge des sessions multi-commandes (dine-in)
-- ==============================================================================

-- Ajout ciblé de la colonne session_id si non présente
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS session_id uuid;

-- Index partiel optimisé : indexe uniquement les lignes ayant un session_id
CREATE INDEX IF NOT EXISTS idx_payments_session_id
    ON public.payments (session_id)
    WHERE session_id IS NOT NULL;


-- ==============================================================================
-- 2. TABLE SUBSCRIPTION_EVENTS : Index composite pour l'historique chronologique
-- ==============================================================================

-- Index composite adapté pour les requêtes affichant l'historique d'un restaurant par date décroissante
CREATE INDEX IF NOT EXISTS idx_subscription_events_restaurant_created
    ON public.subscription_events (restaurant_id, created_at DESC);


-- ==============================================================================
-- 3. PUBLICATION SUPABASE_REALTIME (Idempotent)
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'subscription_payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_payments;
    END IF;
END
$$;

-- Notifier le cache PostgREST pour recharger le schéma immédiatement
NOTIFY pgrst, 'reload schema';
