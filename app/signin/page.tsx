'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Employee = {
  first_name: string | null
  last_name: string | null
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      // 1) Qui est connecté ?
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user ?? null
      if (!user) {
        setLoading(false)
        return
      }
      setEmail(user.email ?? null)

      // 2) Binder le user à employees (si pas déjà fait)
      await supabase.rpc('bind_user_to_employee')

      // 3) Récupérer sa fiche employé
      const { data: emp } = await supabase
        .from('employees')
        .select('first_name,last_name')
        .eq('user_id', user.id)
        .maybeSingle()

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
        <>
          <p>Bonjour <b>{employee.first_name ?? ''} {employee.last_name ?? ''}</b> 👋</p>
          <p>Bienvenue ! Prochaine étape : formulaire de recommandation et dashboard.</p>
        </>
      ) : (
        <>
          <p>Bienvenue.</p>
          <p>
            {email
              ? "Ton compte n'est pas encore lié à une fiche employé (vérifie l'email dans la table employees)."
              : <>Tu n’es pas connecté. <a href="/signin">Se connecter</a></>
            }
          </p>
        </>
      )}
    </main>
  )
}
