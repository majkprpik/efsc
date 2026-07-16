/**
 * Preskače Orbitov sidebar/inset: pregled treba izgledati kao klijentov portal,
 * a ne kao stranica unutar Orbita.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">{children}</div>;
}
