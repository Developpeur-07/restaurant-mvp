-- ============================================================
-- 026 — SESSIONS : un seul appareil actif par compte
-- ============================================================
--
-- Règle décidée : quand un second appareil se connecte, l'ancien est
-- déconnecté, MAIS seulement après une vérification de double
-- authentification. Sans cette vérification, une personne qui aurait volé un
-- mot de passe pourrait évincer le propriétaire légitime de son propre
-- compte — ce serait une prise de contrôle, pas une protection.
--
-- Répartition des rôles, à garder en tête :
--   - cette table ne fait que DÉTECTER et JOURNALISER. Elle n'est pas une
--     barrière de sécurité : un attaquant qui y écrit ne déconnecte personne.
--   - la révocation réelle est faite par l'API (api/sessions/revoke-others.js)
--     via auth.admin.signOut(jwt, 'others'), qui invalide les jetons de
--     rafraîchissement côté Supabase. Supabase reste la source d'autorité.
--
-- Conséquence : si cette table est vide ou fausse, on perd la détection, pas
-- la sécurité. C'est un choix délibéré.

create table if not exists public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  -- Identifiant d'appareil généré côté client et conservé en localStorage.
  -- Ce n'est PAS un secret : il sert à distinguer deux appareils d'un même
  -- compte, rien de plus. La sécurité repose sur les jetons Supabase.
  device_id    text not null,
  device_label text,
  user_agent   text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  unique (user_id, device_id)
);

create index if not exists user_sessions_lookup_idx
  on public.user_sessions (user_id, revoked_at, last_seen_at desc);

alter table public.user_sessions enable row level security;

-- Chacun ne voit et ne touche que ses propres appareils. L'API passe par la
-- clé service_role et contourne cette règle, volontairement : c'est elle qui
-- orchestre la révocation.
drop policy if exists user_sessions_self on public.user_sessions;
create policy user_sessions_self on public.user_sessions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Fenêtre d'activité
-- ------------------------------------------------------------
-- Un appareil est considéré actif s'il a donné signe de vie il y a moins de
-- cinq minutes. Pourquoi une fenêtre et pas un simple « connecté » : quand on
-- ferme un onglet, rien ne prévient le serveur. Sans fenêtre, un appareil
-- resterait actif éternellement et le propriétaire se verrait réclamer un code
-- 2FA à chaque reconnexion sur son propre téléphone.
--
-- Cinq minutes pour un battement envoyé toutes les 60 secondes : deux
-- battements manqués suffisent à libérer la place, ce qui laisse passer une
-- microcoupure réseau sans fausse alerte.
comment on column public.user_sessions.last_seen_at is
  'Dernier battement de coeur. Actif si supérieur à now() - 5 minutes.';
