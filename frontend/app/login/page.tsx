'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_EMAILS, login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAILS[0]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const session = login(email, password);
    if (!session) {
      setError('Credenciales inválidas. Pista: la contraseña es "password".');
      return;
    }

    router.push(session.role === 'admin' ? '/admin' : '/cliente');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="text-sm text-slate-500">
          Login de demo (usuarios quemados) — soporte ImagineApps.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Usuario
        </label>
        <select
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-slate-300 p-2 text-sm text-slate-900"
        >
          {DEMO_EMAILS.map((demoEmail) => (
            <option key={demoEmail} value={demoEmail}>
              {demoEmail}
            </option>
          ))}
        </select>

        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="rounded-md border border-slate-300 p-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
