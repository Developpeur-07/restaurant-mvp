import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/dashboard' }
    })
    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center">
        <p className="text-4xl mb-4">📧</p>
        <p className="font-bold text-lg mb-2">Vérifiez votre email</p>
        <p className="text-gray-500 text-sm">Un lien de connexion a été envoyé à {email}</p>
      </div>
    </div>
  )

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">Accès restaurateur</h1>
        <input
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleLogin}
          disabled={!email || loading}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-bold disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Recevoir le lien de connexion'}
        </button>
      </div>
    </div>
  )
}