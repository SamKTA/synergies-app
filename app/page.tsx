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
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUserEmail(data.user.email ?? null)
        setUserId(data.user.id)

        const { data: emp } = await supabase
          .from('employees')
          .select('first_name, last_name')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (emp?.first_name && emp?.last_name) {
          setFullName(`${emp.first_name} ${emp.last_name}`)
        }
      }
    }
    run()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-lg space-y-4">
        {userEmail && userId && fullName ? (
          <>
            <h1 className="text-3xl font-bold">Bonjour {fullName} 👋</h1>
            <p className="text-gray-700 text-lg">
              Bienvenue dans l'espace Synergies.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Bienvenue dans l'espace Synergies.</h1>
            <p className="text-gray-700 text-lg">
              Clique sur <strong>se connecter</strong> pour accéder à ton espace personnel, ou pour activer ton compte si c'est ta première connexion.
            </p>
            <a
              href="/login"
              className="inline-block mt-2 px-5 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
            >
              Se connecter
            </a>
          </>
        )}
      </div>
    </main>
  )
}
