// app/layout.tsx
import './globals.css'
import Link from 'next/link'
import './globals.css'

export const metadata = {
  title: 'Synergies App',
  description: 'Plateforme interne de recommandations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header style={{ backgroundColor: '#0f172a', padding: '12px 24px' }}>
          <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>🎯 Synergies</Link>
              <Link href="/inbox" style={{ color: 'white', textDecoration: 'none' }}>Mes reçues</Link>
              <Link href="/sent" style={{ color: 'white', textDecoration: 'none' }}>Mes envoyées</Link>
              <Link href="/kanban" style={{ color: 'white', textDecoration: 'none' }}>Kanban</Link>
              <Link href="/reco/new" style={{ color: 'white', textDecoration: 'none' }}>Nouvelle reco</Link>
            </div>
            <Link href="/login" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>Se connecter / Mon compte</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
