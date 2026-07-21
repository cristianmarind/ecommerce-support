# ImagineApps — Módulo de Soporte

Módulo para gestionar el soporte de un e-commerce con IA y agentes humanos. Un usuario
describe su problema, el sistema lo clasifica y responde (por IA o derivándolo a un
agente humano) a través de un hilo de mensajes.

Este repositorio ya tiene el modelo de datos completo y persistencia real en PostgreSQL,
pero **todavía no hay IA real ni autenticación real**: la clasificación/respuesta de IA
está quemada, y la identidad del usuario que llama a la API se resuelve con guards y
decoradores "quemados" (ver [Autenticación (quemada por ahora)](#autenticación-quemada-por-ahora)).

## Stack

**Backend** (`backend/`)
- Node.js + NestJS + TypeScript
- TypeORM + PostgreSQL, con migraciones (sin `synchronize`)
- Arquitectura hexagonal: `src/domain`, `src/application`, `src/infrastructure`

**Frontend** (`frontend/`)
- React + Next.js (App Router) + TypeScript
- TailwindCSS

**Infraestructura**
- Docker Compose con hot-reload (volúmenes montados) para desarrollo

## Requisitos

- Docker y Docker Compose

## Cómo levantar el proyecto

1. Copia los archivos de variables de entorno de ejemplo (si no existen ya):

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Levanta todo con Docker Compose:

   ```bash
   docker compose up --build
   ```

   Al arrancar, el backend corre automáticamente las migraciones pendientes
   (`migrationsRun: true`), así que el esquema y los datos semilla (roles, permisos y
   2 usuarios demo) quedan listos sin pasos manuales.

3. Servicios disponibles:

   | Servicio  | URL                              |
   |-----------|-----------------------------------|
   | Frontend  | http://localhost:3000             |
   | Backend   | http://localhost:3001/api/v1      |
   | PostgreSQL| localhost:5432                    |

Los volúmenes están configurados para que los cambios en `backend/src` y en el código del
`frontend` se reflejen automáticamente dentro de los contenedores (hot-reload), sin
necesidad de reconstruir la imagen.

Para detener los servicios:

```bash
docker compose down
```

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
  `suggestedResponse` + `confidenceScore` solo se llenan en mensajes de IA.

Todas las tablas comparten las columnas de auditoría mínimas: `id`, `createdAt`,
`updatedAt`, `creatorId`, `updaterId` (ver `AuditableBaseEntity`).

## Autenticación (quemada por ahora)

Todavía no hay login real. Los endpoints están protegidos por un `FakeAuthGuard` que
deja pasar cualquier petición, y el usuario "actual" se obtiene con el decorador
`@CurrentUserId('customer' | 'admin')`, que retorna el id de uno de los 2 usuarios
sembrados por la migración en vez de leer un token real:

- Cliente demo: `11111111-1111-1111-1111-111111111111` (usado al crear tickets/mensajes)
- Admin demo: `22222222-2222-2222-2222-222222222222` (usado al listar tickets)

Ambos archivos (`infrastructure/http/auth/guards/fake-auth.guard.ts` y
`.../decorators/current-user-id.decorator.ts`) tienen comentarios `TODO` marcando
exactamente dónde iría la lógica real de autenticación, autorización y "get current
user" cuando se implemente.

## Endpoints actuales

### `POST /api/v1/tickets`

Crea un ticket y genera automáticamente un primer mensaje de IA (quemado).

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
      "content": "Un agente revisará tu caso y te responderá a la brevedad.",
      "suggestedResponse": "Un agente revisará tu caso y te responderá a la brevedad.",
      "confidenceScore": 0.65,
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

> Nota: la categoría, el estado inicial y la respuesta de IA siguen quemados — la
> clasificación real con IA se integrará más adelante.

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
    persistence/typeorm/
      entities/     # Entidades TypeORM (mapeo a tablas)
      repositories/ # Implementaciones de los puertos del dominio
      migrations/   # Migraciones versionadas del esquema
  app.module.ts      # Composición: conecta infraestructura con el resto
  main.ts
```

## Próximos pasos

- Autenticación y autorización reales (reemplazar `FakeAuthGuard`/`CurrentUserId`).
- Endpoints de gestión de usuarios/roles/permisos.
- Integrar clasificación y respuesta automática con IA real.
- Vista/flujo para agentes humanos (bandeja de tickets, responder mensajes).

Ver [CLAUDE.md](./CLAUDE.md) para más contexto de trabajo con Claude Code en este repo.
