# CLAUDE.md

Guía para trabajar en este repositorio con Claude Code.

## Qué es este proyecto

Módulo de soporte de un e-commerce con IA y agentes humanos. Un usuario describe su
problema; el sistema lo clasifica con IA y responde automáticamente o lo deriva a un
agente humano, a través de un hilo de mensajes por ticket.

**Estado actual:** modelo de datos completo y persistencia real en PostgreSQL vía
TypeORM + migraciones. La clasificación/respuesta de IA sigue quemada (sin IA real
todavía), y no hay autenticación real — ver [Autenticación quemada](#autenticación-quemada).

## Cómo levantar el entorno

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/v1
- PostgreSQL: localhost:5432

Los `volumes` en `docker-compose.yml` montan el código fuente dentro de los contenedores,
así que los cambios en `backend/src` y `frontend/` se reflejan con hot-reload sin
reconstruir la imagen. Solo reconstruye (`--build`) si cambias `package.json` o los
Dockerfiles. Al arrancar, el backend corre las migraciones pendientes automáticamente
(`migrationsRun: true` en `typeorm.config.ts`) — es idempotente, seguro de dejar así en
dev.

## Modelo de datos

- **User / Role / Permission / RolePermission**: RBAC base. Un `User` tiene un único
  `Role` (columna `role_id`, no hay tabla `UserRole`); un `Role` tiene muchos
  `Permission` vía `RolePermission`. Tanto clientes como agentes/admins son filas de
  `User`, diferenciadas por su rol. **Solo existen como esquema + seed de datos** — no
  hay endpoints/casos de uso de gestión de usuarios todavía; eso es trabajo futuro.
- **Ticket**: `description`, `status`, `category`. `status` tiene 5 valores:
  `RESOLVIENDO_IA`, `RESUELTO_IA`, `PENDIENTE_AGENTE`, `RESOLVIENDO_AGENTE`,
  `RESUELTO_AGENTE`.
- **Message**: hilo de conversación de un `Ticket` (`ticket_id` FK, `ON DELETE CASCADE`).
  `senderType` es `CLIENTE`, `IA` o `AGENTE`. `suggestedResponse` + `confidenceScore`
  son específicos de mensajes de IA (null en mensajes de cliente/agente).

Todas las tablas heredan de `AuditableBaseEntity` (`infrastructure/persistence/typeorm/entities/auditable.base-entity.ts`):
`id`, `createdAt`, `updatedAt`, `creatorId`, `updaterId`. `creatorId`/`updaterId`
apuntan a `users.id` mediante FK declarada directamente en la migración (no como
`@ManyToOne` en la entidad, para evitar imports circulares entre la base y `User`).

**Convención importante**: `creatorId` en `Ticket`/`Message` no es solo un campo de
auditoría genérico — también identifica quién es el solicitante/autor real (el cliente
que abrió el ticket o escribió el mensaje). No se agregó un campo `customerId`/`authorId`
separado a propósito, para no duplicar la misma información.

## Autenticación quemada

Todavía no hay login real. Sigue este patrón al agregar nuevos endpoints que necesiten
saber "quién hace la petición":

- `infrastructure/http/auth/guards/fake-auth.guard.ts` (`FakeAuthGuard`): deja pasar
  cualquier petición. Tiene un comentario `TODO` marcando dónde iría la validación real
  de JWT/sesión (autenticación) y de permisos (autorización).
- `infrastructure/http/auth/decorators/current-user-id.decorator.ts`
  (`@CurrentUserId('customer' | 'admin')`): retorna el id de un usuario sembrado
  (`SEEDED_CUSTOMER_ID` / `SEEDED_ADMIN_ID` en `auth/constants/seeded-users.ts`) en vez
  de leer el usuario autenticado real. Tiene un `TODO` marcando dónde iría el "get
  current user" real.

Cuando se implemente autenticación real, ambos archivos son los puntos de reemplazo —
los controllers que los usan (`TicketsController`) no deberían necesitar cambios más
allá de que el guard/decorador reales tengan la misma forma (guard que puebla
`request.user`, decorador que lo lee).

## Arquitectura del backend

NestJS con **arquitectura hexagonal a nivel de raíz** (no por módulo/feature primero):

```
backend/src/
  domain/
    tickets/              # Entidad Ticket, TicketStatus/TicketCategory, puerto TicketRepository
    messages/              # Entidad Message, MessageSenderType, puerto MessageRepository
    common/                 # AuditableFields (contrato de campos de auditoría)
  application/
    tickets/use-cases/     # CreateTicketUseCase, ListTicketsUseCase, SendMessageUseCase
  infrastructure/
    http/
      tickets/              # Controller y DTOs (adaptador de entrada)
      auth/                 # Guards/decoradores de auth quemados (ver arriba)
    persistence/typeorm/
      entities/             # Entidades TypeORM (User, Role, Permission, RolePermission, Ticket, Message)
      repositories/         # Implementaciones TypeORM de los puertos del dominio
      migrations/           # Migraciones versionadas
      identity.module.ts    # Registra entidades de User/Role/Permission (sin casos de uso propios aún)
    config/
      typeorm.config.ts     # Config de conexión usada por AppModule (synchronize: false)
      data-source.ts        # DataSource usado solo por el CLI de TypeORM (migraciones)
```

Reglas a mantener al extender esto:

- `domain/` no importa nada de `application/` ni `infrastructure/`. Solo entidades,
  enums y contratos (interfaces/puertos).
- `application/` depende de `domain/` (a través de los puertos, inyectados por token,
  ej. `TICKET_REPOSITORY`, `MESSAGE_REPOSITORY`), nunca de una implementación concreta.
- `infrastructure/` implementa los puertos del dominio (controllers, repositorios
  TypeORM, configuración) y es lo único que conoce frameworks/librerías externas
  (Nest, TypeORM, Express).
- Al agregar un nuevo agregado, replicar el mismo patrón de subcarpetas dentro de
  `domain/`, `application/` e `infrastructure/`.
- Los repositorios TypeORM (`infrastructure/persistence/typeorm/repositories/`) hacen el
  mapeo entidad TypeORM ↔ entidad de dominio explícitamente (`toDomain`), no exponen la
  entidad TypeORM fuera de la capa de infraestructura.

### Migraciones

```bash
docker compose exec backend npm run migration:generate -- src/infrastructure/persistence/typeorm/migrations/NombreDescriptivo
docker compose exec backend npm run migration:run
docker compose exec backend npm run migration:revert
```

`migration:generate` compara las entidades TypeORM contra el estado real de la BD (usa
`data-source.ts`, que apunta a los .ts en `src/`), así que el contenedor de Postgres debe
estar corriendo. **Revisa siempre el diff generado antes de commitear** — en este repo ya
pasó que el diff salió incompleto (`ALTER TYPE` en vez de `CREATE TABLE`) por generarlo
contra una BD que no estaba realmente vacía; si algo se ve raro, prueba regenerar contra
un volumen de Postgres limpio (`docker compose down -v && docker compose up -d postgres backend`).

## Arquitectura del frontend

Next.js App Router + TailwindCSS, todo en TypeScript.

```
frontend/
  app/                # Rutas (App Router). page.tsx es el dashboard de soporte
  components/         # Componentes de UI (TicketForm, TicketsTable, TicketsDashboard)
  lib/                # Cliente API (api.ts) y labels de estado/categoría (labels.ts)
```

`TicketsDashboard` es el componente cliente que orquesta el formulario de creación y la
tabla paginada, llamando al backend vía `NEXT_PUBLIC_API_URL` (definido en
`frontend/.env`, apunta a `http://localhost:3001/api/v1` porque el fetch ocurre en el
navegador del usuario, no dentro del contenedor). Cada `Ticket` que devuelve la API trae
su array `messages`; la tabla hoy solo muestra el último mensaje — todavía no hay UI para
enviar mensajes de seguimiento desde el frontend (el endpoint `POST /tickets/:id/messages`
ya existe en el backend, falta conectarlo en la UI).

## Convenciones

- Todo el código y comentarios del proyecto en español (mensajes de usuario, DTOs,
  labels), identificadores de código en inglés.
- No agregar abstracciones para casos hipotéticos futuros (feature flags, capas extra)
  hasta que el requisito exista.
- Sin tests todavía — no hay convención establecida aún.

## Próximos pasos conocidos

1. Autenticación y autorización reales (reemplazar `FakeAuthGuard`/`CurrentUserId`).
2. Endpoints y casos de uso de gestión de usuarios/roles/permisos.
3. Integrar clasificación/respuesta con IA real en `CreateTicketUseCase`.
4. UI para que el cliente envíe mensajes de seguimiento y para que un agente responda.
5. Vista para agentes humanos (bandeja de tickets pendientes/asignados).

No implementar estos puntos de forma preventiva — se abordarán en iteraciones
posteriores, uno a la vez.
