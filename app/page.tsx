'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ✅ Test console (à voir dans F12 > Console)
console.log("✅ page.tsx utilisé correctement")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Employee = { first_name: string | null; last_name: string | null }

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErrMsg(null)

      const { data: userData, error: getUserErr } = await supabase.auth.getUser()
      if (getUserErr && getUserErr.message !== 'Auth session missing!') {
        setErrMsg(`getUser error: ${getUserErr.message}`)
      }

      const user = userData?.user ?? null
      if (!user) {
        setLoading(false)
        return
      }

      setEmail(user.email ?? null)
      setUserId(user.id)

      const { error: bindErr } = await supabase.rpc('bind_user_to_employee')
      if (bindErr) setErrMsg(`bind error: ${bindErr.message}`)

      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('first_name,last_name')
        .eq('user_id', user.id)
        .maybeSingle()

      if (empErr) setErrMsg(`select error: ${empErr.message}`)
      if (emp) setEmployee(emp)

      setLoading(false)
    }
    run()
  }, [])

  return (
    <main className="min-h-screen bg-yellow-100 p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-10 space-y-6 border border-yellow-400">
        {/* ✅ Test visuel */}
        <div className="bg-yellow-200 text-yellow-800 text-center font-bold py-2 rounded">
          ✅ TU VOIS CE MESSAGE ? TU ES DANS LE BON `page.tsx` 🎯
        </div>

        <h1 className="text-3xl font-bold text-gray-800">🎯 Synergies App</h1>

        {loading ? (
          <p className="text-gray-500 animate-pulse">Chargement...</p>
        ) : employee ? (
          <p className="text-lg text-gray-700">
            Bonjour <b>{employee.first_name} {employee.last_name}</b> 👋
          </p>
        ) : (
          <>
            <p className="text-base text-gray-700">
              Bienvenue dans l’espace Synergies.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm">
              <p><strong>email :</strong> <code>{email ?? '—'}</code></p>
              <p><strong>user.id :</strong> <code>{userId ?? '—'}</code></p>
            </div>

            {errMsg && (
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded border border-red-300">
                Erreur : {errMsg}
              </div>
            )}

            {!errMsg && (
              <p className="text-sm text-gray-500 italic">
                Clique sur <strong>se connecter</strong> pour accéder à ton espace personnel, ou pour activer ton compte si c’est ta première connexion.
              </p>
            )}

            <a
              href="/login"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 transition"
            >
              Se connecter
            </a>
          </>
        )}
      </div>
    </main>
  )
}
