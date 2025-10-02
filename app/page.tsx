'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Employee = {
  first_name: string | null
  last_name: string | null
  email: string
}

export default function HomePage() {
  const [employee, setEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) return

      const { data: emp, error } = await supabase
        .from('employees')
        .select('first_name, last_name, email')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      if (emp) setEmployee(emp)
    }

    fetchData()
  }, [])

  return (
    <main style={{
      maxWidth: 600,
      margin: '64px auto',
      padding: 24,
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: 12 }}>
        Bienvenue dans l’espace <b>Synergies</b>.
      </h1>

      {!employee && (
        <>
          <p>
            Clique sur <b>se connecter</b> pour accéder à ton espace personnel,
            ou pour activer ton compte si c’est ta première connexion.
          </p>

          <Link
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: 24,
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Se connecter
          </Link>
        </>
      )}

      {employee && (
        <p style={{ marginTop: 12, fontSize: 18 }}>
          Bonjour <b>{employee.first_name} {employee.last_name}</b> 👋<br />
          Ravi de te revoir sur l’espace Synergies.
        </p>
      )}
    </main>
  )
}
