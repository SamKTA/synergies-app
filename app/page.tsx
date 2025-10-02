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
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) {
        setUserEmail(data.user.email)
        setUserId(data.user.id)
      }
    }
    fetchUser()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Bienvenue dans l'espace Synergies.</h1>

        <p className="mb-2">
          <strong>email :</strong> {userEmail ?? '–'}
        </p>
        <p className="mb-4">
          <strong>user.id :</strong> {userId ?? '–'}
        </p>

        <p className="mb-4">
          Clique sur <strong>se connecter</strong> pour accéder à ton espace personnel,
          ou pour activer ton compte si c’est ta première connexion.
        </p>

        <a
          href="/login"
          className="inline-block px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Se connecter
        </a>
      </div>
    </main>
  )
}
