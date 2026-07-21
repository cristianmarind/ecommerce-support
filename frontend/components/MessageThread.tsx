import { Message } from '@/lib/api';

const OTHER_STYLES: Record<Message['senderType'], string> = {
  CLIENTE: 'self-start bg-slate-100 text-slate-800',
  IA: 'self-start bg-sky-50 text-sky-900 border border-sky-200',
  AGENTE: 'self-start bg-emerald-50 text-emerald-900 border border-emerald-200',
};

const OWN_STYLE = 'self-end bg-slate-900 text-white';

interface MessageThreadProps {
  messages: Message[];
  /** Desde qué rol se está viendo el hilo — decide qué mensajes son "propios" (a la derecha) y cómo se etiqueta cada remitente. */
  viewerRole: 'cliente' | 'admin';
  /** Admin: además del contenido, muestra el borrador/confianza de los mensajes de IA. */
  showAiDetails?: boolean;
}

export function MessageThread({
  messages,
  viewerRole,
  showAiDetails = false,
}: MessageThreadProps) {
  if (messages.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay mensajes.</p>;
  }

  const ownSenderType: Message['senderType'] =
    viewerRole === 'cliente' ? 'CLIENTE' : 'AGENTE';

  const senderLabels: Record<Message['senderType'], string> = {
    CLIENTE: viewerRole === 'cliente' ? 'Vos' : 'Cliente',
    IA: 'IA',
    AGENTE: viewerRole === 'admin' ? 'Vos' : 'Agente',
  };

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => {
        const isOwn = message.senderType === ownSenderType;

        return (
          <div
            key={message.id}
            className={`flex max-w-md flex-col gap-1 rounded-lg px-4 py-3 text-sm ${
              isOwn ? OWN_STYLE : OTHER_STYLES[message.senderType]
            }`}
          >
            <span className="text-xs font-medium uppercase tracking-wide opacity-70">
              {senderLabels[message.senderType]}
            </span>
            <p>{message.content}</p>
            {showAiDetails &&
              message.senderType === 'IA' &&
              message.confidenceScore !== null &&
              message.confidenceScore !== undefined && (
                <p className="text-xs opacity-70">
                  Confianza: {Math.round(message.confidenceScore * 100)}%
                </p>
              )}
          </div>
        );
      })}
    </div>
  );
}
