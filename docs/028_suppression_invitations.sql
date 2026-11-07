-- docs/028_suppression_invitations.sql
--
-- Permettre au propriétaire de supprimer manuellement ses liens d'invitation
-- staff, depuis Paramètres → Équipe.
--
-- À exécuter dans l'éditeur SQL Supabase.
--
-- ── Pourquoi un script à part ────────────────────────────────────────────────
-- La table staff_invitation_tokens n'apparaît dans AUCUNE migration du dépôt :
-- comme is_restaurant_staff, elle a été créée hors dépôt, directement dans
-- l'éditeur. Ses politiques RLS ne sont donc pas traçables ici, et on ne peut
-- pas savoir à l'avance si DELETE est déjà autorisé.
--
-- Sans politique de suppression, un bouton « Supprimer » échouerait en silence :
-- Postgres n'interdit rien, il ne renvoie simplement aucune ligne à supprimer.
-- C'est le piège classique du RLS — l'absence d'erreur n'est pas un succès.
--
-- ── Pourquoi le propriétaire seulement ───────────────────────────────────────
-- Un lien d'invitation donne accès au restaurant. Savoir qui peut le révoquer
-- est une décision de sécurité, pas une commodité.
--
-- La génération de ces liens est déjà réservée au propriétaire (section
-- « Équipe » des Paramètres, profil propriétaire). La suppression suit la même
-- règle : celui qui peut ouvrir la porte est celui qui peut la refermer.
-- Les rôles admin et reception sont volontairement exclus.
--
-- Même prédicat que stock_items_write dans docs/024_inventaire.sql.

drop policy if exists staff_invitation_tokens_delete on public.staff_invitation_tokens;

create policy staff_invitation_tokens_delete on public.staff_invitation_tokens
  for delete to authenticated
  using (
    exists (select 1 from public.restaurants r
             where r.id = staff_invitation_tokens.restaurant_id
               and r.owner_id = auth.uid())
  );

-- ── Vérification ────────────────────────────────────────────────────────────
-- Cette requête liste les politiques en place sur la table après exécution.
-- Si elle ne renvoie rien du tout, la table n'existe pas sous ce nom : ne pas
-- continuer, le bouton ne peut pas fonctionner.

select policyname, cmd, permissive
from pg_policies
where schemaname = 'public'
  and tablename = 'staff_invitation_tokens'
order by cmd, policyname;
