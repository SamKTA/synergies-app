'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setUserEmail(data.user.email)
      }
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

      {!userEmail && (
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
              fontWeight: 'bold',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#1e40af')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            Se connecter
          </Link>
        </>
      )}

      {userEmail && (
        <p>
          Connecté en tant que <b>{userEmail}</b>
        </p>
      )}
    </main>
  )
}
