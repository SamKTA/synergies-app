// ... (imports et setup identiques)
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
  is_active?: boolean | null
}

// 💡 Liste des projets avec leurs couleurs douces
const PROJECT_OPTIONS: { label: string, color: string }[] = [
  { label: 'Vente', color: '#fde2e4' },
  { label: 'Achat', color: '#dbeafe' },
  { label: 'Location', color: '#fef9c3' },
  { label: 'Gestion', color: '#e0f2fe' },
  { label: 'Location & Gestion', color: '#ede9fe' },
  { label: 'Syndic', color: '#f0fdf4' },
  { label: 'Ona Entreprises', color: '#ffe4e6' },
  { label: 'Recrutement', color: '#fef2f2' },
]

export default function NewRecoPage() {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectTitle, setProjectTitle] = useState('') // sécurise valeur vide par défaut
  const [projectAddress, setProjectAddress] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [receiverId, setReceiverId] = useState<string>('')

  const [me, setMe] = useState<Employee | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const [receiverSearch, setReceiverSearch] = useState('')
  const [receiverOpen, setReceiverOpen] = useState(false)

  const receiver = useMemo(
    () => employees.find(e => e.id === receiverId) ?? null,
    [employees, receiverId]
  )

  const filteredEmployees = useMemo(() => {
    const s = receiverSearch.trim().toLowerCase()
    if (!s) return employees
    return employees.filter(e => {
      const fn = (e.first_name ?? '').toLowerCase()
      const ln = (e.last_name ?? '').toLowerCase()
      const em = (e.email ?? '').toLowerCase()
      return fn.includes(s) || ln.includes(s) || em.includes(s)
    })
  }, [employees, receiverSearch])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)

      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) { setError(userErr.message); setLoading(false); return }
      const user = userData?.user
      if (!user) { setError('Tu dois être connecté.'); setLoading(false); return }

      const { data: meRow, error: meErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, is_active')
        .eq('user_id', user.id)
        .maybeSingle()
      if (meErr) { setError(meErr.message); setLoading(false); return }
      if (!meRow) { setError('Aucune fiche employé liée à ton compte.'); setLoading(false); return }
      setMe(meRow)

      const { data: list, error: listErr } = await supabase.rpc('list_active_employees')
      if (listErr) { setError(listErr.message); setLoading(false); return }
      setEmployees((list ?? []) as Employee[])

      setLoading(false)
    }
    run()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!me) { setError('Utilisateur non identifié.'); return }
    if (!receiver) { setError('Choisis un receveur.'); return }
    if (!clientName) { setError('Le nom du client est requis.'); return }

    setSubmitting(true)

    const prescriptorName = [me.first_name ?? '', me.last_name ?? ''].join(' ').trim()

    const payload = {
      prescriptor_id: me.id,
      prescriptor_name: prescriptorName,
      prescriptor_email: me.email,

      receiver_id: receiver.id,
      receiver_email: receiver.email,

      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,

      project_title: projectTitle || null,
      project_details: projectDetails || null,
      project_address: projectAddress || null,
    }

    const { error: insertErr } = await supabase
      .from('recommendations')
      .insert(payload)

    if (insertErr) {
      setError(`Erreur à l’enregistrement : ${insertErr.message}`)
      setSubmitting(false)
      return
    }

    try {
      const emailSubject = `Nouvelle recommandation – ${clientName}`
      const emailHtml = `
        <h2>Nouvelle recommandation</h2>
        <p><b>Client :</b> ${clientName}</p>
        ${clientEmail ? `<p><b>Email client :</b> ${clientEmail}</p>` : ''}
        ${clientPhone ? `<p><b>Téléphone client :</b> ${clientPhone}</p>` : ''}
        ${projectTitle ? `<p><b>Projet :</b> ${projectTitle}</p>` : ''}
        ${projectAddress ? `<p><b>Adresse :</b> ${projectAddress}</p>` : ''}
        ${projectDetails ? `<p><b>Détails :</b><br/>${projectDetails.replace(/\n/g,'<br/>')}</p>` : ''}
        <hr/>
        <p>Prescripteur : ${prescriptorName} (${me.email})</p>
        <p style="margin-top: 20px;"><a href="https://synergies-app-orpi.vercel.app" style="background: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">🔗 Ouvrir l'application Synergies</a></p>
      `.trim()

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: receiver.email,
          cc: me.email,
          subject: emailSubject,
          html: emailHtml
        })
      })
    } catch (e) {
      console.warn('Email send failed:', e)
    }

    setOk(true)
    setSubmitting(false)
    setClientName(''); setClientEmail(''); setClientPhone('');
    setProjectTitle(''); setProjectAddress(''); setProjectDetails('');
    setReceiverId(''); setReceiverSearch(''); setReceiverOpen(false)
  }

  if (loading) {
    return <main style={{ maxWidth: 720, margin: '64px auto', fontFamily: 'sans-serif' }}>Chargement…</main>
  }

  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Nouvelle recommandation</h1>
      {me && (
        <p style={{ opacity: .7, marginTop: 4 }}>
          Prescripteur : <b>{me.first_name ?? ''} {me.last_name ?? ''}</b> ({me.email})
        </p>
      )}

      {ok && (
        <div style={{ padding: 12, background: '#e6ffed', border: '1px solid #b7eb8f', margin: '16px 0' }}>
          ✅ Recommandation enregistrée.
        </div>
      )}
      {error && (
        <div style={{ padding: 12, background: '#fff1f0', border: '1px solid #ffa39e', margin: '16px 0', color: '#cf1322' }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* CHAMP : Projet concerné avec couleurs */}
        <label style={{ display: 'block', marginTop: 12 }}>
          Projet concerné
          <select
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          >
            <option value="">— Sélectionner —</option>
            {PROJECT_OPTIONS.map(opt => (
              <option key={opt.label} value={opt.label} style={{ background: opt.color }}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Les autres champs (identiques à avant) */}
        <label style={{ display: 'block', marginTop: 12 }}>
          Nom du client *
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Email du client
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Téléphone du client
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Adresse du projet
          <input
            value={projectAddress}
            onChange={(e) => setProjectAddress(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Détails du projet
          <textarea
            value={projectDetails}
            onChange={(e) => setProjectDetails(e.target.value)}
            rows={5}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ marginTop: 16, padding: 12, width: '100%' }}
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer la recommandation'}
        </button>
      </form>
    </main>
  )
}
