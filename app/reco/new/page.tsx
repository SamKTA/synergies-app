'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Employee = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  is_active: boolean | null
}

export default function NewRecoPage() {
  // Champs formulaire
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [receiverId, setReceiverId] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  // Moi = employé connecté
  const [meId, setMeId] = useState<string>('')
  const [meName, setMeName] = useState<string>('')
  const [meEmail, setMeEmail] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) return
      const { data: me } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (me) {
        setMeId(me.id)
        setMeName(`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim())
        setMeEmail(me.email)
      }
    }
    run()
  }, [])

  // Receveurs possibles = tout le monde sauf moi
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('employees').select('*').neq('id', meId)
      if (data) setEmployees(data)
    }
    if (meId) load()
  }, [meId])

  const receiver = useMemo(() => employees.find(e => e.id === receiverId), [receiverId, employees])

  const send = async () => {
    if (!clientName || !projectTitle || !receiverId) return
    setSending(true)

    // Enregistrer la reco dans Supabase
    const { error, data: reco } = await supabase.from('recommendations').insert({
      prescriptor_id: meId,
      prescriptor_name: meName,
      presriptor_email: meEmail,
      receiver_id: receiverId,
      receiver_email: receiver?.email ?? null,
      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      project_title: projectTitle,
      project_details: projectDetails || null,
      project_address: projectAddress || null,
    }).select().maybeSingle()

    // Envoyer un e-mail au destinataire
    if (reco?.id && receiver?.email) {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: receiver.email,
          subject: `Nouvelle recommandation de ${meName}`,
          html: `<p>Bonjour ${receiver.first_name ?? ''},</p>
                 <p>Tu as reçu une nouvelle recommandation de la part de <strong>${meName}</strong>.</p>
                 <p><strong>Client :</strong> ${clientName}<br/>
                 <strong>Projet :</strong> ${projectTitle}</p>
                 <p><a href="https://synergies-app-orpi.vercel.app/inbox">Voir dans l'app</a></p>`
        })
      })
    }

    setSending(false)
    setDone(true)
  }

  if (done) return (
    <main style={{ maxWidth: 600, margin: '48px auto', padding: 24 }}>
      <h2>✅ Recommandation envoyée !</h2>
      <p><a href="/inbox">Retour</a></p>
    </main>
  )

  return (
    <main style={{ maxWidth: 600, margin: '48px auto', padding: 24 }}>
      <h1>Nouvelle recommandation</h1>

      <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop: 32 }}>
        <input placeholder="Nom du client" value={clientName} onChange={e=>setClientName(e.target.value)} />
        <input placeholder="Email du client" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} />
        <input placeholder="Tél du client" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} />

        <input placeholder="Projet / besoin" value={projectTitle} onChange={e=>setProjectTitle(e.target.value)} />
        <textarea placeholder="Détails / précisions (optionnel)" value={projectDetails} onChange={e=>setProjectDetails(e.target.value)} />
        <input placeholder="Adresse du projet (optionnel)" value={projectAddress} onChange={e=>setProjectAddress(e.target.value)} />

        <select value={receiverId} onChange={e => setReceiverId(e.target.value)}>
          <option value="">Destinataire</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
          ))}
        </select>

        <button
          onClick={send}
          disabled={!clientName || !projectTitle || !receiverId || sending}
          style={{ padding: '12px 16px', background: '#334155', color: 'white', border: 'none', borderRadius: 6 }}>
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </main>
  )
}
