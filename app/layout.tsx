import './globals.css'
import Link from 'next/link'
import AdminLink from './_components/AdminLink'

export const metadata = {
  title: 'Synergies App',
  description: 'Recommandations internes Orpi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div style={{ backgroundColor: "#111827", padding: 12, display: "flex", justifyContent: "space-between" }}>
          <div>
            <Link href="/" style={{ color: "white", opacity: 0.9, textDecoration: "none", padding: "6px 8px", fontWeight: "bold" }}>🎯 Synergies</Link>
            <Link href="/inbox" style={{ color: "white", opacity: 0.9, textDecoration: "none", padding: "6px 8px" }}>Mes reçues</Link>
            <Link href="/outbox" style={{ color: "white", opacity: 0.9, textDecoration: "none", padding: "6px 8px" }}>Mes envoyées</Link>
            <Link href="/kanban" style={{ color: "white", opacity: 0.9, textDecoration: "none", padding: "6px 8px" }}>Kanban</Link>
            <Link href="/reco/new" style={{ color: "white", opacity: 0.9, textDecoration: "none", padding: "6px 8px" }}>Nouvelle reco</Link>
            <AdminLink />
          </div>
          <Link href="/login" style={{ color: "white", opacity: 0.9, textDecoration: "none", padding: "6px 8px" }}>Se connecter / Mon compte</Link>
        </div>
        {children}
      </body>
    </html>
  )
}
