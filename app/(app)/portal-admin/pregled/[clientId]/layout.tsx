/**
 * Preskače Orbitov sidebar/inset: pregled treba izgledati kao klijentov portal,
 * a ne kao stranica unutar Orbita.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-background">{children}</div>;
}
