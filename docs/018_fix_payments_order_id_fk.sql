-- Migration 018: Suppression de la contrainte FK sur payments.order_id
-- Permet l'archivage des commandes (DELETE FROM orders) sans violation de FK.
-- Date: 2026-09-13

-- 1. Suppression de la contrainte de clé étrangère stricte
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;

-- 2. Publication Realtime pour la table payments (au cas où non cochée via le dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
