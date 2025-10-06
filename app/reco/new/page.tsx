// ✅ Code complet avec :
// 1. Le champ "Projet concerné" en menu déroulant coloré doux
// 2. Le champ "Receveur" avec le sélecteur intelligent conservé

'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PROJECT_OPTIONS = [
  { label: 'Vente', color: '#fde2e4' },
  { label: 'Achat', color: '#dbeafe' },
  { label: 'Location', color: '#fef9c3' },
  { label: 'Gestion', color: '#e0f2fe' },
  { label: 'Location & Gestion', color: '#ede9fe' },
  { label: 'Syndic', color: '#f0fdf4' },
  { label: 'Ona Entreprises', color: '#ffe4e6' },
  { label: 'Recrutement', color: '#fef2f2' },
]

type Employee = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  is_active?: boolean | null
}

export default function NewRecoPage() {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [receiverId, setReceiverId] = useState('')

  const [me, setMe] = useState<Employee | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const [receiverSearch, setReceiverSearch] = useState('')
  const [receiverOpen, setReceiverOpen] = useState(false)

  const receiver = useMemo(() => employees.find(e => e.id === receiverId) ?? null, [employees, receiverId])
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
      if (userErr) return setError(userErr.message), setLoading(false)

      const user = userData?.user
      if (!user) return setError('Tu dois être connecté.'), setLoading(false)

      const { data: meRow, error: meErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, is_active')
        .eq('user_id', user.id)
        .maybeSingle()
      if (meErr || !meRow) return setError(meErr?.message ?? 'Fiche employé manquante.'), setLoading(false)
      setMe(meRow)

      const { data: list, error: listErr } = await supabase.rpc('list_active_employees')
      if (listErr) return setError(listErr.message), setLoading(false)
      setEmployees((list ?? []) as Employee[])

      setLoading(false)
    }
    run()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!me || !receiver || !clientName) return setError('Champs requis manquants.')
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

    const { error: insertErr } = await supabase.from('recommendations').insert(payload)
    if (insertErr) return setError(`Erreur : ${insertErr.message}`), setSubmitting(false)

    try {
      const emailHtml = `
        <h2>Nouvelle recommandation</h2>
        <p><b>Client :</b> ${clientName}</p>
        ${clientEmail ? `<p><b>Email :</b> ${clientEmail}</p>` : ''}
        ${clientPhone ? `<p><b>Tél :</b> ${clientPhone}</p>` : ''}
        ${projectTitle ? `<p><b>Projet :</b> ${projectTitle}</p>` : ''}
        ${projectAddress ? `<p><b>Adresse :</b> ${projectAddress}</p>` : ''}
        ${projectDetails ? `<p><b>Détails :</b><br/>${projectDetails.replace(/\n/g, '<br/>')}</p>` : ''}
        <hr/>
        <p>Prescripteur : ${prescriptorName} (${me.email})</p>
        <p><a href="https://synergies-app-orpi.vercel.app" style="...">🔗 Ouvrir Synergies</a></p>
      `

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: receiver.email,
          cc: me.email,
          subject: `Nouvelle recommandation – ${clientName}`,
          html: emailHtml
        })
      })
    } catch (e) { console.warn('Erreur email:', e) }

    setOk(true); setSubmitting(false)
    setClientName(''); setClientEmail(''); setClientPhone('')
    setProjectTitle(''); setProjectAddress(''); setProjectDetails('')
    setReceiverId(''); setReceiverSearch(''); setReceiverOpen(false)
  }

  if (loading) return <main style={{ maxWidth: 720, margin: '64px auto' }}>Chargement…</main>

  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24 }}>
      <h1>Nouvelle recommandation</h1>
      {me && (
        <p style={{ opacity: .7 }}>Prescripteur : <b>{me.first_name} {me.last_name}</b> ({me.email})</p>
      )}
      {ok && <div style={{ background: '#e6ffed', padding: 12, margin: '16px 0' }}>✅ Recommandation enregistrée.</div>}
      {error && <div style={{ background: '#fff1f0', padding: 12, margin: '16px 0', color: '#cf1322' }}>{error}</div>}

      <form onSubmit={onSubmit}>
        {/* --- RECO SELECTEUR --- */}
        <label style={{ display: 'block', marginTop: 12, position: 'relative' }}>
          Receveur
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input
              value={receiverSearch}
              onChange={(e) => { setReceiverSearch(e.target.value); setReceiverOpen(true) }}
              onFocus={() => setReceiverOpen(true)}
              placeholder="Tape un nom ou e-mail"
              style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
            />
            {receiverId && (
              <button type="button" onClick={() => { setReceiverId(''); setReceiverSearch(''); setReceiverOpen(false) }} style={{ padding:'8px 10px' }}>Effacer</button>
            )}
          </div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            {receiver ? <>Sélectionné : <b>{receiver.first_name} {receiver.last_name}</b> — {receiver.email}</> : <>Aucun receveur</>}
          </div>
          {receiverOpen && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e5e7eb', maxHeight: 240, overflowY:'auto', zIndex:10 }}>
              {filteredEmployees.length === 0 && <div style={{ padding: 10, color: '#94a3b8' }}>Aucun résultat…</div>}
              {filteredEmployees.map(emp => (
                <button key={emp.id} type="button" onClick={() => {
                  setReceiverId(emp.id)
                  setReceiverSearch(`${emp.first_name ?? ''} ${emp.last_name ?? ''} — ${emp.email}`)
                  setReceiverOpen(false)
                }} style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 12px', border:'none', background:'white' }}>
                  <div style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{emp.email}</div>
                </button>
              ))}
            </div>
          )}
        </label>

        {/* --- Champ Projet concerné (menu déroulant) --- */}
        <label style={{ display: 'block', marginTop: 12 }}>
          Projet concerné
          <select
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          >
            <option value="">— Choisir —</option>
            {PROJECT_OPTIONS.map(opt => (
              <option key={opt.label} value={opt.label} style={{ background: opt.color }}>{opt.label}</option>
            ))}
          </select>
        </label>

        {/* Autres champs... */}
        <label style={{ display: 'block', marginTop: 12 }}>
          Nom du client *
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Email du client
          <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Téléphone du client
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Adresse du projet
          <input value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Détails du projet
          <textarea value={projectDetails} onChange={(e) => setProjectDetails(e.target.value)} rows={5} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </label>

        <button type="submit" disabled={submitting} style={{ marginTop: 16, padding: 12, width: '100%' }}>
          {submitting ? 'Enregistrement…' : 'Enregistrer la recommandation'}
        </button>
      </form>
    </main>
  )
}
