'use client';

import { FormEvent, useState } from 'react';

interface SendMessageFormProps {
  onSend: (content: string) => Promise<void>;
}

export function SendMessageForm({ onSend }: SendMessageFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSend(content.trim());
      setContent('');
    } catch {
      setError('Ocurrió un error al enviar el mensaje. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label htmlFor="message-content" className="text-sm font-medium text-slate-700">
        Enviar mensaje
      </label>
      <textarea
        id="message-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Escribe tu mensaje..."
        className="resize-none rounded-md border border-slate-300 p-2 text-sm text-slate-900 outline-none focus:border-slate-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !content.trim()}
        className="self-end rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}
