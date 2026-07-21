# CLAUDE.md

Guía para trabajar en este repositorio con Claude Code.

## Qué es este proyecto

Módulo de soporte de un e-commerce con IA y agentes humanos. Un cliente describe su
problema; un RAG (LangChain + Redis + OpenAI/Anthropic) responde usando los manuales de
soporte como base de conocimiento, y si no alcanza, un agente humano lo atiende a través
de un hilo de mensajes por ticket.

**Estado actual:** modelo de datos completo, persistencia real en PostgreSQL, y RAG real
sobre Redis ya conectado a la creación de tickets. **No hay autenticación real** — ni en
la API (guards/decoradores quemados) ni en el frontend (login con usuarios quemados) — ver
[Autenticación quemada](#autenticación-quemada).

## Cómo levantar el entorno

```bash
docker compose up --build
```

- Frontend: http://localhost:3000 (redirige a `/login`)
- Backend: http://localhost:3001/api/v1
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Los `volumes` en `docker-compose.yml` montan el código fuente dentro de los contenedores,
así que los cambios en `backend/src` y `frontend/` se reflejan con hot-reload sin
reconstruir la imagen. Solo reconstruye (`--build`) si cambias `package.json` o los
Dockerfiles.

Al arrancar, el backend (todo idempotente, seguro de re-ejecutar en cada restart del
watch mode):
1. Corre las migraciones pendientes (`migrationsRun: true` en `typeorm.config.ts`).
2. Genera los PDF de manuales en `backend/manuales/` si no existen (`ManualsSeedService`).
3. Indexa esos PDF como vectores en Redis si el índice todavía está vacío
   (`ManualsIndexingService`) — necesita `AI_API_KEY`/`OPENAI_API_KEY`; si falta, lo
   loguea como warning y sigue arrancando sin RAG funcional (fallback controlado).

**Login de prueba** (`/login`, contraseña `password` para ambos):
`cliente.demo@imagineapps.test` → `/cliente` · `admin.demo@imagineapps.test` → `/admin`.

## Modelo de datos

- **User / Role / Permission / RolePermission**: RBAC base. Un `User` tiene un único
  `Role` (columna `role_id`, no hay tabla `UserRole`); un `Role` tiene muchos
  `Permission` vía `RolePermission`. Tanto clientes como agentes/admins son filas de
  `User`, diferenciadas por su rol. **Solo existen como esquema + seed de datos** — no
  hay endpoints/casos de uso de gestión de usuarios todavía; eso es trabajo futuro.
- **Ticket**: `description`, `status`, `category`. `status` tiene 5 valores:
  `RESOLVIENDO_IA`, `RESUELTO_IA`, `PENDIENTE_AGENTE`, `RESOLVIENDO_AGENTE`,
  `RESUELTO_AGENTE`. `category` sigue quemada en `GENERAL` (no hay clasificación real).
- **Message**: hilo de conversación de un `Ticket` (`ticket_id` FK, `ON DELETE CASCADE`).
  `senderType` es `CLIENTE`, `IA` o `AGENTE`. `suggestedResponse` + `confidenceScore`
  son específicos de mensajes de IA (vienen del RAG; null en mensajes de cliente/agente).

Todas las tablas heredan de `AuditableBaseEntity` (`infrastructure/persistence/typeorm/entities/auditable.base-entity.ts`):
`id`, `createdAt`, `updatedAt`, `creatorId`, `updaterId`. `creatorId`/`updaterId`
apuntan a `users.id` mediante FK declarada directamente en la migración (no como
`@ManyToOne` en la entidad, para evitar imports circulares entre la base y `User`).

**Convención importante**: `creatorId` en `Ticket`/`Message` no es solo un campo de
auditoría genérico — también identifica quién es el solicitante/autor real (el cliente
que abrió el ticket o escribió el mensaje). No se agregó un campo `customerId`/`authorId`
separado a propósito, para no duplicar la misma información.

## RAG (LangChain + Redis + OpenAI/Anthropic)

`CreateTicketUseCase` depende del puerto de dominio `RagQueryPort`
(`domain/knowledge-base/rag-query.port.ts`), implementado por `LangchainRagService`
(`infrastructure/knowledge-base/rag/`). Flujo:

1. `ManualsSeedService.generate()` crea los PDF por categoría en `backend/manuales/`
   (ver `manuals.data.ts`) si no existen. Son para servir/descargar más adelante — el
   RAG **no los lee de vuelta** (ver por qué abajo).
2. `ManualsIndexingService.indexManuals()` indexa en Redis (`RedisVectorStore` de
   `@langchain/redis`) el texto de `MANUALS_CONTENT` directamente — la misma fuente que
   usa `ManualsSeedService` para generar los PDF —, troceado con un chunker propio
   mínimo (`text-splitter.ts`).
3. `KnowledgeBaseBootstrapService` (`OnApplicationBootstrap`, con try/catch: un fallo acá
   nunca debe tumbar el arranque del backend) corre 1 y 2. Ya no hay dependencia de orden
   entre ambos (el indexado no lee los PDF), se mantienen secuenciales por prolijidad.
4. `LangchainRagService.query(question)`: busca los fragmentos más similares en Redis
   (`similaritySearchWithScore`), arma un prompt con ese contexto, se lo pasa al modelo
   de chat (`ChatOpenAI` o `ChatAnthropic`, según `AI_PROVIDER`), y retorna
   `{ aiSuggestedResponse, confidenceScore }`. `confidenceScore` sale de la distancia de
   la búsqueda vectorial (heurístico `1 - distancia`, no calibrado), no de que el modelo
   se autoevalúe. Probado end-to-end con una API key real de OpenAI: retrieval +
   generación + score funcionan correctamente.

**Sin `AI_API_KEY`/`OPENAI_API_KEY` configuradas, todo sigue funcionando**: cada paso
(`VectorStoreProvider.getStore()`, `LangchainRagService.query()`) detecta la ausencia de
key y degrada con gracia (logs de warning + una respuesta de fallback con
`confidenceScore: 0`), en vez de tirar la app abajo. Mantené este patrón si tocás este
código.

**Gotcha real de este repo — `pdfkit` genera PDF corruptos intermitentemente**: al
generar varios PDF seguidos con `pdfkit` en este entorno, una fracción (~10-40% en
pruebas aisladas de 20+ corridas) salía con bytes corruptos y no lo detectaba `file` ni
un `fsync` explícito tras el evento `finish` del stream — solo se manifestaba al
intentar volver a parsearlos (`pdf-parse` tiraba `bad XRef entry`, no reproducible de
forma determinística: fallaban archivos distintos en cada corrida). No se identificó la
causa raíz exacta dentro de `pdfkit`/`fontkit`. La solución no fue perseguir ese bug de
la librería, sino **eliminar el round-trip**: `ManualsIndexingService` indexa
`MANUALS_CONTENT` (texto fuente) directamente en vez de leer/parsear los PDF generados,
así que esto ya no afecta al RAG. Si en algún momento se necesita indexar PDF subidos
externamente (no generados por este repo), hay que resolver esa fragilidad de verdad
antes (probar otra librería de generación, o parsear con reintentos + validación de
checksum) — no asumir que un simple `await` del stream alcanza, según lo visto acá. Este
bug también significa que los PDF en `backend/manuales/` pueden salir ocasionalmente
corruptos como *documento descargable*; como todavía no se sirven a ningún usuario, no
se atacó ese ángulo — señalarlo si se implementa esa función.

**Gotcha real de este repo — versiones de LangChain JS**: el ecosistema `@langchain/*`
tiene versiones mutuamente incompatibles circulando a la vez (`@langchain/community`
quedó atascado en peer-deps viejas de `langchain@0.3.x`, mientras `@langchain/core`,
`@langchain/openai`, `@langchain/anthropic` y `@langchain/redis` ya están en la línea
`1.x`). Por eso este proyecto **no usa** `@langchain/community` ni el paquete `langchain`
sin scope — el `PDFLoader` y el `RecursiveCharacterTextSplitter` se reemplazaron por
código propio muy simple (`pdf-parse` + `text-splitter.ts`) para no arrastrar esa
dependencia. Si vas a agregar otro paquete `@langchain/*`, verificá con
`npm view <paquete> peerDependencies` que la versión de `@langchain/core` que pide sea
compatible con la que ya está instalada (`npm view @langchain/core version` para la
última), en vez de asumir que el número de versión que se te ocurra va a resolver bien.

Variables de entorno relevantes (`backend/.env`): `AI_PROVIDER`, `AI_API_KEY`,
`AI_MODEL`, `OPENAI_API_KEY` (embeddings, siempre OpenAI), `EMBEDDINGS_MODEL`,
`REDIS_URL`, `REDIS_INDEX_NAME`. Detalle de cada una en README.md.

## Autenticación quemada

Todavía no hay login real en ningún lado. Sigue este patrón al agregar nuevos endpoints
que necesiten saber "quién hace la petición":

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

El login del frontend (`frontend/lib/auth.ts`, usuarios quemados + `localStorage`) es
una capa de UX separada y **no está conectada** a esta identidad del backend — son dos
simulaciones independientes que hoy coinciden "de casualidad" (los mismos 2 usuarios
demo). Al implementar auth real, hay que unificarlas.

## Arquitectura del backend

NestJS con **arquitectura hexagonal a nivel de raíz** (no por módulo/feature primero):

```
backend/src/
  domain/
    tickets/               # Entidad Ticket, TicketStatus/TicketCategory, puerto TicketRepository
    messages/               # Entidad Message, MessageSenderType, puerto MessageRepository
    knowledge-base/         # Puerto RagQueryPort
    common/                 # AuditableFields (contrato de campos de auditoría)
  application/
    tickets/use-cases/      # CreateTicket, ListTickets, SendMessage, UpdateTicketStatus
  infrastructure/
    http/
      tickets/               # Controller y DTOs (adaptador de entrada)
      auth/                  # Guards/decoradores de auth quemados (ver arriba)
    knowledge-base/
      manuals.data.ts        # Contenido de los manuales por categoría
      manuals-seed.service.ts       # Genera los PDF (idempotente)
      knowledge-base-bootstrap.service.ts  # Orquesta seed -> indexado al arrancar
      rag/                    # ai-config, model-factory, vector-store, indexing, query
    persistence/typeorm/
      entities/              # Entidades TypeORM (User, Role, Permission, RolePermission, Ticket, Message)
      repositories/          # Implementaciones TypeORM de los puertos del dominio
      migrations/            # Migraciones versionadas
      identity.module.ts     # Registra entidades de User/Role/Permission (sin casos de uso propios aún)
    config/
      typeorm.config.ts      # Config de conexión usada por AppModule (synchronize: false)
      data-source.ts         # DataSource usado solo por el CLI de TypeORM (migraciones)
```

Reglas a mantener al extender esto:

- `domain/` no importa nada de `application/` ni `infrastructure/`. Solo entidades,
  enums y contratos (interfaces/puertos).
- `application/` depende de `domain/` (a través de los puertos, inyectados por token,
  ej. `TICKET_REPOSITORY`, `MESSAGE_REPOSITORY`, `RAG_QUERY_PORT`), nunca de una
  implementación concreta.
- `infrastructure/` implementa los puertos del dominio (controllers, repositorios
  TypeORM, LangChain/Redis, configuración) y es lo único que conoce frameworks/librerías
  externas (Nest, TypeORM, Express, LangChain).
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

### Gotcha de Docker en Windows: volumen de `node_modules` desincronizado

Cuando cambies `package.json` (nuevas dependencias), `docker compose up --build` sí
reconstruye la imagen con el `node_modules` correcto, pero el volumen nombrado
`backend_node_modules` (montado sobre `/app/node_modules` para no perder deps al hacer
bind-mount del código) puede quedarse con el contenido viejo si ya existía de un run
anterior. Si ves errores `Cannot find module` de un paquete que sabés que agregaste,
corré `docker compose exec backend npm install` (y si eso da conflictos de peer-deps
por deps viejas colgadas, `rm -f package-lock.json && rm -rf node_modules/@algo` seguido
de `npm install` limpio dentro del contenedor).

## Arquitectura del frontend

Next.js App Router + TailwindCSS, todo en TypeScript.

```
frontend/
  app/
    page.tsx        # Redirige a /login o /cliente|/admin según la sesión
    login/page.tsx   # Login quemado (dropdown de 2 usuarios demo + password)
    cliente/page.tsx  # Formulario de creación de ticket + respuesta de la IA
    admin/page.tsx    # Tabla de tickets + acciones (Cerrar / Reasignar a Humano)
  components/
    TicketForm.tsx         # Formulario de creación (usado en /cliente)
    AdminTicketsTable.tsx   # Tabla con estado/categoría/confianza/acciones (usado en /admin)
  lib/
    api.ts            # Cliente HTTP hacia el backend
    auth.ts            # Login/logout/sesión quemados (localStorage)
    use-auth-guard.ts   # Hook que protege /cliente y /admin, redirige a /login si no aplica
    labels.ts           # Labels/colores de status y categoría para la UI
```

El fetch al backend ocurre en el navegador del usuario (no dentro del contenedor), por
eso `NEXT_PUBLIC_API_URL` en `frontend/.env` apunta a `http://localhost:3001/api/v1`
(el puerto expuesto en el host), no a `http://backend:3001` (solo resoluble dentro de la
red de Docker).

`useAuthGuard('cliente' | 'admin')` es un hook simple, no un middleware de Next —
cada página protegida lo llama y hace su propio `redirect` a `/login` si no hay sesión o
el rol no coincide. Es intencionalmente así de simple porque la sesión es 100% cosmética
(`localStorage`, sin validar contra el backend); no vale la pena un middleware real hasta
que haya autenticación real que proteger.

## Convenciones

- Todo el código y comentarios del proyecto en español (mensajes de usuario, DTOs,
  labels), identificadores de código en inglés.
- No agregar abstracciones para casos hipotéticos futuros (feature flags, capas extra)
  hasta que el requisito exista.
- Sin tests todavía — no hay convención establecida aún.

## Próximos pasos conocidos

1. Autenticación y autorización reales (reemplazar `FakeAuthGuard`/`CurrentUserId` en
   el backend, y conectar el login del frontend a esa identidad real en vez de
   simularla con `localStorage`).
2. Endpoints y casos de uso de gestión de usuarios/roles/permisos.
3. Clasificación automática de `category` por IA (hoy sigue quemada en `GENERAL`; solo
   la respuesta sugerida usa el RAG real).
4. UI para que el cliente envíe mensajes de seguimiento y para que un agente responda
   dentro del hilo (el endpoint `POST /tickets/:id/messages` ya existe, falta UI).
5. Calibrar `confidence_score` (hoy es un heurístico simple de distancia vectorial).

No implementar estos puntos de forma preventiva — se abordarán en iteraciones
posteriores, uno a la vez.
