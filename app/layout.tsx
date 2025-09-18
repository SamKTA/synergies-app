import Link from "next/link";

export const metadata = {
  title: "Synergies App",
  description: "Gestion des recommandations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, Arial, sans-serif", background: "#fff" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#0f172a",
            color: "white",
            borderBottom: "1px solid rgba(255,255,255,.1)",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link href="/" style={{ color: "white", textDecoration: "none", fontWeight: 700 }}>
                Synergies
              </Link>
              <nav style={{ display: "flex", gap: 12 }}>
                <Link href="/inbox" style={linkStyle}>Mes reçues</Link>
                <Link href="/kanban" style={linkStyle}>Kanban</Link>
                <Link href="/outbox" style={linkStyle}>Mes envoyées</Link>
                <Link href="/reco/new" style={linkStyle}>Nouvelle reco</Link>
                {/* Optionnel : visible seulement pour direction plus tard */}
                {/* <Link href="/admin" style={linkStyle}>Direction</Link> */}
              </nav>
            </div>
            <div style={{ opacity: .85, fontSize: 14 }}>
              {/* Astuce simple : renvoie vers /login qui gère login/logout */}
              <Link href="/login" style={{ color: "white", textDecoration: "none" }}>
                Se connecter / Mon compte
              </Link>
            </div>
          </div>
        </header>

        <main style={{ minHeight: "calc(100vh - 56px)" }}>{children}</main>

        <footer style={{ borderTop: "1px solid #eee", padding: "14px 20px", textAlign: "center" }}>
          <small style={{ color: "#666" }}>© {new Date().getFullYear()} Synergies</small>
        </footer>
      </body>
    </html>
  );
}

const linkStyle: React.CSSProperties = {
  color: "white",
  opacity: 0.9,
  textDecoration: "none",
  padding: "6px 8px",
  borderRadius: 8,
};
