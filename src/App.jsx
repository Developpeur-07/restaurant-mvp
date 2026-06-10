import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [status, setStatus] = useState('Test en cours...')

  useEffect(() => {
    supabase.from('restaurants').select('count')
      .then(({ error }) => {
        setStatus(error ? '❌ Erreur : ' + error.message : '✅ Supabase connecté')
      })
  }, [])

  return <div className="p-8 text-xl">{status}</div>
} 