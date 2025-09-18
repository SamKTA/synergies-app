export const metadata = {
  title: 'Synergies App',
  description: 'Gestion des recommandations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
