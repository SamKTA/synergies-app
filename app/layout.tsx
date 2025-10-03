import './globals.css'
import Link from 'next/link'
import AdminLink from './_components/AdminLink'

export const metadata = {
  title: 'Synergies App',
  description: 'Plateforme interne de recommandations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header style={{ backgroundColor: '#0f172a', padding: '12px 24px' }}>
          <nav
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <Link href="/" style={linkStyle}>🎯 Synergies</Link>
              <Link href="/inbox" style={linkStyle}>Mes reçues</Link>
              <Link href="/sent" style={linkStyle}>Mes envoyées</Link>
              <Link href="/reco/new" style={linkStyle}>Nouvelle reco</Link>
              <AdminLink /> {/* ✅ Le lien Commissions s'insère naturellement ici */}
            </div>
            <Link href="/login" style={{ ...linkStyle, fontWeight: 500, opacity: 0.9 }}>
              Se connecter / Mon compte
            </Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}

const linkStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  padding: '6px 10px',
  borderRadius: 6,
}
