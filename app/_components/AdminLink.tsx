'use client'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminLink() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) return
      const { data: me } = await supabase
        .from('employees')
        .select('role')
        .eq('user_id', u.user.id)
        .maybeSingle()
      setIsAdmin(me?.role === 'admin')
    })()
  }, [])

  if (!isAdmin) return null
  return (
    <Link href="/admin/commissions" style={linkStyle}>
      Commissions
    </Link>
  )
}

const linkStyle: React.CSSProperties = {
  color: 'white',
  opacity: 0.9,
  textDecoration: 'none',
  padding: '6px 8px',
  borderRadius: 8,
}
