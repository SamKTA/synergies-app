'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function NewRecoPage() {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [receiverId, setReceiverId] = useState('')
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('is_active', true)

      if (error) {
        console.error('Erreur chargement des employés :', error.message)
      } else {
        setEmployees(data ?? [])
      }
    }

    fetchEmployees()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      alert('Utilisateur non connecté.')
      return
    }

    const { data: me } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!me) {
      alert('Fiche employé introuvable.')
      return
    }

    const { error } = await supabase.from('recommendations').insert({
      prescriptor_id: me.id,
      prescriptor_name: `${me.first_name} ${me.last_name}`.trim(),
      presriptor_email: user.email,
      receiver_id: receiverId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      project_title: projectTitle,
      project_details: projectDetails,
      project_address: projectAddress,
    })

    if (error) {
      alert('Erreur lors de l\'enregistrement')
      return
    }

    const receiver = employees.find(e => e.id === receiverId)
    if (receiver) {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: receiver.email,
          subject: '📬 Nouvelle recommandation reçue',
          html: `
            <p>Bonjour ${receiver.first_name},</p>
            <p>Tu as reçu une nouvelle recommandation pour le client <strong>${clientName}</strong> concernant <strong>${projectTitle}</strong>.</p>
            <p><a href="https://synergies-app-orpi.vercel.app/inbox">Voir la recommandation</a></p>
          `
        })
      })
    }

    alert('Recommandation envoyée !')
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    setProjectTitle('')
    setProjectDetails('')
    setProjectAddress('')
    setReceiverId('')
  }

  return (
    <main style={{ maxWidth: 500, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Nouvelle recommandation</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input placeholder="Nom du client" value={clientName} onChange={e => setClientName(e.target.value)} />
        <input placeholder="Email du client" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
        <input placeholder="Tél du client" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
        <input placeholder="Projet / besoin" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} />
        <textarea placeholder="Détails / précisions (optionnel)" value={projectDetails} onChange={e => setProjectDetails(e.target.value)} />
        <input placeholder="Adresse du projet (optionnel)" value={projectAddress} onChange={e => setProjectAddress(e.target.value)} />

        <label>Destinataire</label>
        <select value={receiverId} onChange={e => setReceiverId(e.target.value)} required>
          <option value="">-- Choisir un collaborateur --</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name}
            </option>
          ))}
        </select>

        <button type="submit" style={{ background: '#334155', color: 'white', padding: 12, borderRadius: 6 }}>
          Envoyer
        </button>
      </form>
    </main>
  )
}
