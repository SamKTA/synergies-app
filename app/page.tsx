'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

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
    <div className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-xl p-10 space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">🎯 Synergies App</h1>

        {loading ? (
          <p className="text-gray-500 text-sm animate-pulse">Chargement...</p>
        ) : employee ? (
          <p className="text-lg">Bonjour <b>{employee.first_name} {employee.last_name}</b> 👋</p>
        ) : (
          <>
            <p className="text-base text-gray-700">Bienvenue dans l’espace Synergies.</p>
            <div className="bg-gray-100 rounded-md p-3 text-sm text-left text-gray-800">
              <p><span className="font-semibold">email :</span> <code>{email ?? '—'}</code></p>
              <p><span className="font-semibold">user.id :</span> <code>{userId ?? '—'}</code></p>
            </div>

            {errMsg && (
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm border border-red-300">
                Erreur : {errMsg}
              </div>
            )}

            {!errMsg && (
              <p className="text-sm text-gray-500 italic">
                Clique sur <b>se connecter</b> pour accéder à ton espace personnel, ou pour activer ton compte si c'est ta première connexion.
              </p>
            )}

            <a
              href="/login"
              className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition"
            >
              Se connecter
            </a>
          </>
        )}
      </div>
    </div>
  )
}
