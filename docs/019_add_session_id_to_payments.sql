-- Migration 019: Ajout de la colonne session_id à la table payments
-- Permet la consolidation des paiements pour une session multi-commandes (dine-in).
-- Date: 2026-09-13

ALTER TABLE payments ADD COLUMN IF NOT EXISTS session_id uuid NULL;

-- Index pour optimiser les requêtes Realtime et Webhook par session_id
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
