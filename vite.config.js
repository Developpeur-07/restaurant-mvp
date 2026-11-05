import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Hôtes autorisés à joindre le serveur de développement, séparés par des
// virgules. Sert à ouvrir le dev server depuis un tunnel / un appareil mobile
// (ex. test terrain) sans toucher au fichier de config :
//   VITE_DEV_HOSTS=".e2b.app,mon-domaine.fr" npm run dev
// Un hôte préfixé d'un point autorise tous ses sous-domaines.
// Sans cette variable, Vite garde sa politique par défaut (hôtes locaux seuls).
const devAllowedHosts = (process.env.VITE_DEV_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const VENDOR_CHUNKS = [
  { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
  { name: 'supabase', test: /[\\/]node_modules[\\/]@supabase[\\/]/ },
  { name: 'router', test: /[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/ },
]

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    allowedHosts: devAllowedHosts,
  },
  build: {
    rollupOptions: {
      output: {
        // Découpage des dépendances lourdes et stables (React, Supabase,
        // routeur) dans des chunks séparés : elles changent rarement, donc le
        // navigateur les garde en cache d'un déploiement à l'autre, et elles
        // se téléchargent en parallèle du code applicatif.
        // Rolldown (moteur de build de Vite 8) exige une fonction, pas un objet.
        manualChunks(id) {
          for (const { name, test } of VENDOR_CHUNKS) {
            if (test.test(id)) return name;
          }
          return null;
        },
      },
    },
  },
})
