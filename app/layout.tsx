import Link from "next/link"
import AdminLink from "./_components/AdminLink"
import "./globals.css"

const linkStyle: React.CSSProperties = {
  color: "white",
  opacity: 0.9,
  textDecoration: "none",
  padding: "6px 8px",
}

export const metadata = {
  title: "Synergies App",
  description: "Recommandations internes Orpi",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div style={{ backgroundColor: "#111827", padding: 12, display: "flex", justifyContent: "space-between" }}>
          <div>
            <Link href="/" style={{ ...linkStyle, fontWeight: "bold" }}>🎯 Synergies</Link>
            <Link href="/inbox" style={linkStyle}>Mes reçues</Link>
            <Link href="/outbox" style={linkStyle}>Mes envoyées</Link>
            <Link href="/kanban" style={linkStyle}>Kanban</Link>
            <Link href="/reco/new" style={linkStyle}>Nouvelle reco</Link>
            <AdminLink />
          </div>
          <Link href="/login" style={linkStyle}>Se connecter / Mon compte</Link>
        </div>
        <main>{children}</main>
      </body>
    </html>
  )
}
