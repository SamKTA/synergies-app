'use client'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase'

export default function SignInPage() {
  const supabase = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://synergies-app.vercel.app' } // ton URL Vercel
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main style={{ maxWidth: 360, margin: '64px auto', fontFamily: 'sans-serif' }}>
      <h1>Connexion</h1>
      {sent ? (
        <p>Mail envoyé. Vérifie ta boîte mail.</p>
      ) : (
        <form onSubmit={handleSignIn}>
          <input
            type="email"
            placeholder="ton.email@entreprise.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
            style={{ width:'100%', padding:12, margin:'12px 0' }}
          />
          <button type="submit" style={{ padding:12, width:'100%' }}>
            Recevoir le lien magique
          </button>
          {error && <p style={{ color:'red' }}>{error}</p>}
        </form>
      )}
    </main>
  )
}
