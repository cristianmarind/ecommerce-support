'use client';

import { FormEvent, useState } from 'react';
import { createTicket } from '@/lib/api';

interface TicketFormProps {
  onCreated: () => void;
}

export function TicketForm({ onCreated }: TicketFormProps) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createTicket(description.trim());
      setDescription('');
      onCreated();
    } catch {
      setError('Ocurrió un error al crear el ticket. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label htmlFor="description" className="text-sm font-medium text-slate-700">
        Describe tu problema
      </label>
      <textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Ej: No he recibido mi pedido y ya pasaron 5 días..."
        className="resize-none rounded-md border border-slate-300 p-2 text-sm text-slate-900 outline-none focus:border-slate-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !description.trim()}
        className="self-end rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar ticket'}
      </button>
    </form>
  );
}
