// src/lib/api.js
//
// Petit client pour les endpoints d'administration hébergés sur Vercel
// (dossier /api). Ces routes tournent côté serveur et utilisent la clé
// service_role Supabase : elles doivent toujours être appelées AVEC le jeton
// d'accès de l'utilisateur, jamais de façon anonyme.
//
// Usage :
//   import { apiRequest } from '../lib/api'
//   const { members } = await apiRequest('/api/admin/staff')

import { supabase } from './supabase'

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token

  if (!token) {
    throw new ApiError('Session expirée, reconnecte-toi.', { status: 401 })
  }

  let response
  try {
    response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ApiError('Serveur injoignable. Vérifie ta connexion.', { status: 0 })
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    // Le serveur de développement (vite) retourne index.html pour /api/*
    // au lieu d'un JSON : on traduit ça en message exploitable.
    throw new ApiError(
      "Cette fonctionnalité n'est disponible que sur le site déployé (Vercel).",
      { status: response.status }
    )
  }

  if (!response.ok) {
    throw new ApiError(payload.error || `Erreur ${response.status}`, {
      status: response.status,
      code: payload.code,
    })
  }

  return payload
}

/** Vrai si l'erreur vient d'un backend non configuré (clé service manquante). */
export function isBackendUnavailable(error) {
  return error instanceof ApiError && (error.status === 500 || error.status === 0)
}
