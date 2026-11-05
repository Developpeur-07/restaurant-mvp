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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    allowedHosts: devAllowedHosts,
  },
})
