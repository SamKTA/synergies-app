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

      // 1) Qui est connecté ?
      const { data: userData, error: getUserErr } = await supabase.auth.getUser()
      if (getUserErr) setErrMsg(`getUser error: ${getUserErr.message}`)
      const user = userData?.user ?? null
      if (!user) { setLoading(false); return }

      setEmail(user.email ?? null)
      setUserId(user.id)

      // 2) Binder (au cas où)
      const { error: bindErr } = await supabase.rpc('bind_user_to_employee')
      if (bindErr) setErrMsg(`bind error: ${bindErr.message}`)

      // 3) Récupérer sa fiche employé par user_id
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
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Synergies App</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : employee ? (
        <p>Bonjour <b>{employee.first_name} {employee.last_name}</b> 👋</p>
      ) : (
        <>
          <p>Bienvenue.</p>
          <p>email: <code>{email ?? '—'}</code></p>
          <p>user.id: <code>{userId ?? '—'}</code></p>
          {errMsg ? (
            <p style={{color:'crimson'}}>Erreur: {errMsg}</p>
          ) : (
            <p>Ton compte n’est pas encore lié à une fiche employé. Vérifie la table employees.</p>
          )}
          <p><a href="/login">Se connecter</a></p>
        </>
      )}
    </main>
  )
}

// test redeploy
