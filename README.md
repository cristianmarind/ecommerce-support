# ImagineApps — Módulo de Soporte

Módulo para gestionar el soporte de un e-commerce con IA y agentes humanos. Un cliente
describe su problema, un RAG (LangChain + Redis + OpenAI/Anthropic) responde usando los
manuales internos como base de conocimiento, y si no alcanza, un agente humano lo atiende
a través de un hilo de mensajes.

Persistencia real en PostgreSQL y RAG real sobre Redis ya están conectados de punta a
punta, pero **todavía no hay autenticación real**: tanto la API (guards/decoradores
quemados) como el login del frontend (usuarios quemados) simulan la identidad del usuario
en vez de validarla de verdad — ver [Autenticación (quemada por ahora)](#autenticación-quemada-por-ahora).

## Stack

**Backend** (`backend/`)
- Node.js + NestJS + TypeScript
- TypeORM + PostgreSQL, con migraciones (sin `synchronize`)
- LangChain + Redis (Redis Stack) para RAG sobre los manuales de soporte
- OpenAI y/o Anthropic (Claude) como proveedor de IA, configurable por variables de entorno
- Arquitectura hexagonal: `src/domain`, `src/application`, `src/infrastructure`

**Frontend** (`frontend/`)
- React + Next.js (App Router) + TypeScript
- TailwindCSS
- Login quemado + vista de cliente (crear ticket) + panel de administrador/agente

**Infraestructura**
- Docker Compose con hot-reload (volúmenes montados) para desarrollo

## Requisitos

- Docker y Docker Compose
- (Opcional, para respuestas de IA reales) una API key de OpenAI y/o Anthropic

## Cómo levantar el proyecto

1. Copia los archivos de variables de entorno de ejemplo (si no existen ya):

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. (Opcional) Completa `AI_API_KEY` en `backend/.env` para que el RAG responda de verdad
   — ver [IA / RAG](#ia--rag). Sin key, la app funciona igual, pero el mensaje de IA de
   cada ticket queda como un texto fijo indicando que la IA no está configurada.

3. Levanta todo con Docker Compose:

   ```bash
   docker compose up --build
   ```

   Al arrancar, el backend: corre las migraciones pendientes (schema + seed de roles,
   permisos y 2 usuarios demo), genera los PDF de manuales si no existen, y los indexa
   como vectores en Redis si el índice todavía está vacío. Todo idempotente — reiniciar
   el contenedor no repite trabajo ya hecho.

4. Servicios disponibles:

   | Servicio  | URL                              |
   |-----------|-----------------------------------|
   | Frontend  | http://localhost:3000             |
   | Backend   | http://localhost:3001/api/v1      |
   | PostgreSQL| localhost:5432                    |
   | Redis     | localhost:6379                    |

Los volúmenes están configurados para que los cambios en `backend/src` y en el código del
`frontend` se reflejen automáticamente dentro de los contenedores (hot-reload), sin
necesidad de reconstruir la imagen.

Para detener los servicios:

```bash
docker compose down
```

## Vistas del frontend

Login quemado en `/login` (dos usuarios de prueba, contraseña `password` para ambos):

| Usuario                          | Rol     | Redirige a |
|-----------------------------------|---------|------------|
| `cliente.demo@imagineapps.test`   | Cliente | `/cliente` |
| `admin.demo@imagineapps.test`     | Admin   | `/admin`   |

- **`/cliente`**: formulario para describir un problema. Al enviarlo, muestra la
  respuesta que generó la IA (RAG) y su `confidence_score`.
- **`/admin`**: tabla paginada de todos los tickets, con su categoría, el
  `confidence_score` del mensaje de IA, y botones **Cerrar Ticket**
  (`status → RESUELTO_AGENTE`) y **Reasignar a Humano** (`status → PENDIENTE_AGENTE`).

La sesión se guarda en `localStorage` del navegador; es solo para la experiencia de
usuario del frontend — el backend no la valida (usa sus propios guards/decoradores
quemados, ver abajo). `/` y `/admin` redirigen a `/login` si no hay sesión válida.

## Modelo de datos

```
User ---- role_id ----> Role ----< RolePermission >---- Permission
 |
 | creatorId/updaterId (todas las tablas)
 v
Ticket (description, status, category) ---< Message (senderType, content, suggestedResponse, confidenceScore)
```

- **User / Role / Permission / RolePermission**: base RBAC. Un `User` tiene un único
  `Role`; un `Role` tiene muchos `Permission` a través de `RolePermission`. Tanto
  clientes como agentes/admins son `User`, diferenciados por su rol. Todavía no hay
  endpoints ni casos de uso para gestionarlos — solo existen como esquema + datos
  semilla, listos para cuando se implemente autenticación real.
- **Ticket**: el problema reportado. `status` puede ser `RESOLVIENDO_IA`, `RESUELTO_IA`,
  `PENDIENTE_AGENTE`, `RESOLVIENDO_AGENTE` o `RESUELTO_AGENTE`.
- **Message**: el hilo de conversación de un ticket (respuesta de IA, mensajes del
  cliente, mensajes de un agente). `senderType` es `CLIENTE`, `IA` o `AGENTE`.
  `suggestedResponse` + `confidenceScore` solo se llenan en mensajes de IA (vienen del RAG).

Todas las tablas comparten las columnas de auditoría mínimas: `id`, `createdAt`,
`updatedAt`, `creatorId`, `updaterId` (ver `AuditableBaseEntity`).

## IA / RAG

Al crear un ticket, `CreateTicketUseCase` le pregunta al RAG (`RagQueryPort` en el
dominio) por una respuesta sugerida, usando los manuales de soporte (PDF por categoría,
generados en `backend/manuales/`) como base de conocimiento:

1. Los PDF se indexan en Redis como vectores (embeddings) al arrancar el backend.
2. Al crear un ticket, se busca por similitud vectorial en Redis los fragmentos de
   manual más relevantes a la descripción del problema.
3. Esos fragmentos se pasan como contexto a un modelo de chat (OpenAI o Anthropic,
   según configuración) para redactar la respuesta sugerida.
4. `confidence_score` sale de la similitud de la búsqueda vectorial (no del modelo de
   chat) — ver comentario en `LangchainRagService`.

Variables de entorno (`backend/.env`):

```bash
AI_PROVIDER=openai        # "openai" o "anthropic"
AI_API_KEY=                # key del proveedor elegido arriba
AI_MODEL=gpt-4o-mini        # o claude-3-5-haiku-latest / claude-3-5-sonnet-latest, etc.

# Los embeddings SIEMPRE usan OpenAI (Anthropic no tiene API de embeddings).
# Si AI_PROVIDER=openai, se reutiliza AI_API_KEY y esto puede quedar vacío.
# Si AI_PROVIDER=anthropic, hay que llenar esta key aparte solo para vectorizar.
OPENAI_API_KEY=
EMBEDDINGS_MODEL=text-embedding-3-small

REDIS_URL=redis://redis:6379
REDIS_INDEX_NAME=manuales_idx
```

**Sin `AI_API_KEY` configurada, la app no se rompe**: el RAG detecta que falta la key,
lo loguea como warning, y devuelve una respuesta de fallback con `confidenceScore: 0`
("La IA todavía no está configurada..."). Esto se puede ver en los logs del backend al
arrancar (`RAG deshabilitado: falta configurar la API key de embeddings...`).

## Autenticación (quemada por ahora)

Todavía no hay login real. Los endpoints están protegidos por un `FakeAuthGuard` que
deja pasar cualquier petición, y el usuario "actual" se obtiene con el decorador
`@CurrentUserId('customer' | 'admin')`, que retorna el id de uno de los 2 usuarios
sembrados por la migración en vez de leer un token real:

- Cliente demo: `11111111-1111-1111-1111-111111111111` (usado al crear tickets/mensajes)
- Admin demo: `22222222-2222-2222-2222-222222222222` (usado al listar/actualizar tickets)

Ambos archivos (`infrastructure/http/auth/guards/fake-auth.guard.ts` y
`.../decorators/current-user-id.decorator.ts`) tienen comentarios `TODO` marcando
exactamente dónde iría la lógica real de autenticación, autorización y "get current
user" cuando se implemente. El login del frontend (`/login`) es un paso más de UX sobre
lo mismo: no está conectado a esta identidad real, solo la simula visualmente.

## Endpoints actuales

### `POST /api/v1/tickets`

Crea un ticket y genera automáticamente el primer mensaje de IA usando el RAG.

```json
// Request
{ "description": "No he recibido mi pedido" }

// Response
{
  "id": "uuid",
  "description": "No he recibido mi pedido",
  "status": "PENDIENTE_AGENTE",
  "category": "GENERAL",
  "messages": [
    {
      "id": "uuid",
      "senderType": "IA",
      "content": "...",
      "suggestedResponse": "...",
      "confidenceScore": 0.82,
      "createdAt": "2026-07-20T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-07-20T10:00:00.000Z"
}
```

### `POST /api/v1/tickets/:id/messages`

Agrega un mensaje del cliente al hilo de un ticket existente.

```json
// Request
{ "content": "¿Cuándo tendré una respuesta?" }
```

### `PATCH /api/v1/tickets/:id/status`

Actualiza el estado de un ticket (usado por el panel de admin: Cerrar Ticket /
Reasignar a Humano).

```json
// Request
{ "status": "RESUELTO_AGENTE" }
```

### `GET /api/v1/tickets?page=1&limit=10`

Retorna la lista paginada de tickets, cada uno con su hilo completo de mensajes.

```json
{
  "items": [ /* tickets, cada uno con su array `messages` */ ],
  "total": 6,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

> Nota: la categoría y el estado inicial del ticket siguen quemados (siempre `GENERAL` /
> `PENDIENTE_AGENTE`) — solo la respuesta/confianza del primer mensaje de IA sale del
> RAG real.

## Migraciones

```bash
# Generar una migración nueva a partir de cambios en las entidades
docker compose exec backend npm run migration:generate -- src/infrastructure/persistence/typeorm/migrations/NombreDescriptivo

# Aplicar migraciones pendientes (también corre solo al levantar el contenedor)
docker compose exec backend npm run migration:run

# Revertir la última migración aplicada
docker compose exec backend npm run migration:revert
```

## Estructura del backend (arquitectura hexagonal)

```
backend/src/
  domain/           # Entidades y puertos (interfaces), sin dependencias externas
  application/      # Casos de uso, orquestan el dominio a través de los puertos
  infrastructure/
    http/           # Controllers, DTOs, guards/decoradores de auth (quemados)
    knowledge-base/  # Generación de manuales (PDF) + pipeline RAG (LangChain/Redis)
    persistence/typeorm/
      entities/     # Entidades TypeORM (mapeo a tablas)
      repositories/ # Implementaciones de los puertos del dominio
      migrations/   # Migraciones versionadas del esquema
  app.module.ts      # Composición: conecta infraestructura con el resto
  main.ts
```

## Próximos pasos

- Autenticación y autorización reales (reemplazar `FakeAuthGuard`/`CurrentUserId` y
  conectar el login del frontend a esa identidad real).
- Endpoints de gestión de usuarios/roles/permisos.
- Categorización automática del ticket por IA (hoy `category`/`status` inicial siguen
  quemados; solo la respuesta sugerida usa el RAG real).
- UI para que el cliente envíe mensajes de seguimiento y para que un agente responda.

Ver [CLAUDE.md](./CLAUDE.md) para más contexto de trabajo con Claude Code en este repo.
