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
  const [fullName, setFullName] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) {
        setUserEmail(data.user.email ?? null)
        setUserId(data.user.id)

        // Récupération du prénom/nom
        const { data: emp, error: empErr } = await supabase
          .from('employees')
          .select('first_name, last_name')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (emp && emp.first_name && emp.last_name) {
          setFullName(`${emp.first_name} ${emp.last_name}`)
        }
      }
    }
    run()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center text-center px-4">
      <div className="max-w-xl">
        {userEmail && userId && fullName ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">Bonjour {fullName} 👋</h1>
            <p className="text-gray-700">Bienvenue dans l'espace Synergies.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2">Bienvenue dans l'espace Synergies.</h1>
            <p className="mb-2">Clique sur <strong>se connecter</strong> pour accéder à ton espace personnel, ou pour activer ton compte si c'est ta première connexion.</p>
            <a href="/login" className="text-blue-600 underline">Se connecter</a>
          </>
        )}
      </div>
    </main>
  )
}
