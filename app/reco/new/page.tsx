'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function NewRecoPage() {
  const [clientName, setClientName] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [receiverEmail, setReceiverEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Obtenir l'utilisateur connecté
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setError('Utilisateur non connecté')
      setLoading(false)
      return
    }

    // 2. Récupérer l'employee connecté
    const { data: me, error: meError } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (meError || !me) {
      setError('Fiche employé introuvable.')
      setLoading(false)
      return
    }

    // 3. Récupérer l'ID du receveur via son e-mail
    const { data: receiver, error: receiverError } = await supabase
      .from('employees')
      .select('id')
      .eq('email', receiverEmail)
      .maybeSingle()

    if (receiverError || !receiver) {
      setError("Destinataire non trouvé.")
      setLoading(false)
      return
    }

    // 4. Créer la recommandation
    const { error: insertError } = await supabase.from('recommendations').insert({
      client_name: clientName,
      project_title: projectTitle,
      prescriptor_id: me.id,
      prescriptor_name: me.full_name,
      presriptor_email: userData.user.email,
      receiver_id: receiver.id,
      receiver_email: receiverEmail,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // 5. Envoyer un e-mail au receveur
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: receiverEmail,
        subject: 'Nouvelle recommandation reçue',
        html: `
          <p>Bonjour,</p>
          <p>Vous avez reçu une nouvelle recommandation de <strong>${me.full_name}</strong>.</p>
          <p><strong>Client :</strong> ${clientName}</p>
          <p><strong>Projet :</strong> ${projectTitle}</p>
          <p><a href="https://synergies-app-orpi.vercel.app/inbox">Voir ma reco</a></p>
        `,
      }),
    })

    setSuccess(true)
    setLoading(false)
    setClientName('')
    setProjectTitle('')
    setReceiverEmail('')
  }

  return (
    <main style={{ maxWidth: 600, margin: '48px auto', padding: 24 }}>
      <h1>Nouvelle recommandation</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <input
          type="text"
          placeholder="Nom du client"
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Projet"
          value={projectTitle}
          onChange={e => setProjectTitle(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email du receveur"
          value={receiverEmail}
          onChange={e => setReceiverEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Envoi…' : 'Envoyer la reco'}
        </button>
        {success && <p style={{ color: 'green' }}>Recommandation envoyée ✅</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>
    </main>
  )
}
