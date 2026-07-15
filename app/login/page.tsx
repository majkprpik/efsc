import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-[var(--r)] border border-b bg-bg2 p-8">
        <div className="mb-6 text-center">
          <div className="font-serif text-3xl text-gold">Orbit</div>
          <div className="mt-1 text-[10px] uppercase tracking-[1.5px] text-t3">
            projektni hub · esfc.hr
          </div>
        </div>

        {sp.error && (
          <div className="mb-4 rounded-[var(--rs)] border border-[var(--rb)] bg-[var(--rb)] px-3 py-2 text-xs text-red">
            {sp.error}
          </div>
        )}
        {sp.message && (
          <div className="mb-4 rounded-[var(--rs)] border border-[var(--grb)] bg-[var(--grb)] px-3 py-2 text-xs text-green">
            {sp.message}
          </div>
        )}

        <form className="flex flex-col gap-3">
          <Field name="name" label="Ime i prezime (za registraciju)" placeholder="Ana Kovač" />
          <Field name="email" label="E-mail" type="email" placeholder="ana@esfc.hr" required />
          <Field name="password" label="Lozinka" type="password" placeholder="••••••••" required />

          <button
            formAction={login}
            className="mt-2 rounded-[var(--rs)] bg-gold px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-gold2"
          >
            Prijava
          </button>
          <button
            formAction={signup}
            className="rounded-[var(--rs)] border border-b2 px-4 py-2.5 text-sm text-t2 transition hover:border-b3 hover:text-t"
          >
            Registracija
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[1px] text-t3">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="rounded-[var(--rs)] border border-b2 bg-bg3 px-3 py-2.5 text-sm text-t outline-none placeholder:text-t3 focus:border-[var(--gb2)]"
      />
    </label>
  );
}
