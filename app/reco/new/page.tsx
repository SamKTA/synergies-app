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
  // champs formulaire
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [receiverId, setReceiverId] = useState<string>('')

  // état
  const [me, setMe] = useState<Employee | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const receiver = useMemo(
    () => employees.find(e => e.id === receiverId) ?? null,
    [employees, receiverId]
  )

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)

      // 1) Qui est connecté ?
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) { setError(userErr.message); setLoading(false); return }
      const user = userData?.user
      if (!user) { setError('Tu dois être connecté.'); setLoading(false); return }

      // 2) Récupère ma fiche employé (prescripteur potentiel)
      const { data: meRow, error: meErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, is_active')
        .eq('user_id', user.id)
        .maybeSingle()
      if (meErr) { setError(meErr.message); setLoading(false); return }
      if (!meRow) { setError('Aucune fiche employé liée à ton compte.'); setLoading(false); return }
      setMe(meRow)

      // 3) Récupère la liste des receveurs (tous employés actifs)
      const { data: list, error: listErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, is_active')
        .eq('is_active', true)
        .order('first_name', { ascending: true })
      if (listErr) { setError(listErr.message); setLoading(false); return }
      setEmployees(list ?? [])
      setLoading(false)
    }
    run()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // petites validations rapides
    if (!me) { setError('Utilisateur non identifié.'); return }
    if (!receiver) { setError('Choisis un receveur.'); return }
    if (!clientName) { setError('Le nom du client est requis.'); return }

    setSubmitting(true)

    // construit les champs d'insertion
    const prescriptorName = [me.first_name ?? '', me.last_name ?? ''].join(' ').trim()

    const payload: any = {
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

    // 4) Insert
    const { error: insertErr } = await supabase
      .from('recommendations')
      .insert(payload)

    if (insertErr) {
      setError(`Erreur à l’enregistrement: ${insertErr.message}`)
      setSubmitting(false)
      return
    }

    // 5) Envoi de l'e-mail au receveur (best-effort)
    try {
      const emailSubject = `Nouvelle recommandation – ${clientName}`
      const emailHtml = `
        <h2>Nouvelle recommandation</h2>
        <p><b>Client:</b> ${clientName}</p>
        ${clientEmail ? `<p><b>Email client:</b> ${clientEmail}</p>` : ''}
        ${clientPhone ? `<p><b>Téléphone client:</b> ${clientPhone}</p>` : ''}
        ${projectTitle ? `<p><b>Projet:</b> ${projectTitle}</p>` : ''}
        ${projectAddress ? `<p><b>Adresse:</b> ${projectAddress}</p>` : ''}
        ${projectDetails ? `<p><b>Détails:</b><br/>${projectDetails.replace(/\n/g,'<br/>')}</p>` : ''}
        <hr/>
        <p>Prescripteur: ${prescriptorName} (${me.email})</p>
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
    // reset minimal
    setClientName(''); setClientEmail(''); setClientPhone('');
    setProjectTitle(''); setProjectAddress(''); setProjectDetails('');
    setReceiverId('')
  }

  if (loading) {
    return <main style={{ maxWidth: 720, margin: '64px auto', fontFamily: 'sans-serif' }}>Chargement…</main>
  }

  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Nouvelle recommandation</h1>
      {me && <p style={{ opacity: .7, marginTop: 4 }}>
        Prescripteur : <b>{me.first_name ?? ''} {me.last_name ?? ''}</b> ({me.email})
      </p>}

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
        <label style={{ display: 'block', marginTop: 12 }}>
          Receveur
          <select
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          >
            <option value="">— Choisir —</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {(emp.first_name ?? '') + ' ' + (emp.last_name ?? '')} — {emp.email}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Nom du client *
          <input
            value={clientName}
            onChange={(e)=>setClientName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Email du client
          <input
            type="email"
            value={clientEmail}
            onChange={(e)=>setClientEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Téléphone du client
          <input
            value={clientPhone}
            onChange={(e)=>setClientPhone(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Projet concerné (titre)
          <input
            value={projectTitle}
            onChange={(e)=>setProjectTitle(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Adresse du projet
          <input
            value={projectAddress}
            onChange={(e)=>setProjectAddress(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Détails du projet
          <textarea
            value={projectDetails}
            onChange={(e)=>setProjectDetails(e.target.value)}
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
