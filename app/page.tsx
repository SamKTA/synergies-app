'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) {
        setUserEmail(data.user.email ?? null)
        setUserId(data.user.id ?? null)
      }
    }
    getUser()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-xl w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Bienvenue dans l'espace Synergies.</h1>

        <p>
          <span className="font-bold">email :</span> {userEmail ?? '—'}
        </p>
        <p>
          <span className="font-bold">user.id :</span> {userId ?? '—'}
        </p>

        <p>
          Clique sur <span className="font-semibold">se connecter</span> pour accéder à ton espace personnel,
          ou pour activer ton compte si c’est ta première connexion.
        </p>

        <a
          href="/login"
          className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Se connecter
        </a>
      </div>
    </main>
  )
}
