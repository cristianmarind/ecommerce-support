import { TicketsDashboard } from '@/components/TicketsDashboard';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soporte al cliente</h1>
        <p className="text-sm text-slate-500">
          Cuéntanos tu problema. La IA intentará resolverlo automáticamente; si no puede,
          un agente humano lo atenderá.
        </p>
      </div>
      <TicketsDashboard />
    </main>
  );
}
