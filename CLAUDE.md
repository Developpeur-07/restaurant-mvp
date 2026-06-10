Stack : React (Vite), Supabase (Session Pooler port 5432),
Vercel, TailwindCSS
Environnement : Windows / PowerShell

Patterns autorisés :
- Supabase Realtime pour les statuts commande
- RLS sur toutes les tables sans exception
- Composants fonctionnels React, pas de classes

Patterns interdits :
- Pas de useEffect pour fetcher des données (Supabase client direct)
- Pas de librairie de state management (pas de Redux, Zustand)
- Pas de SSR (Vite pur, pas Next.js)
- Pas de gestion d'erreur silencieuse

Nommage :
- Tables Supabase : snake_case (restaurant_id, estimated_time)
- Composants React : PascalCase
- Hooks : use + PascalCase (useOrders, useMenuItems)