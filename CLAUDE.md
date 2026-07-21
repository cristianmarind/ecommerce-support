# CLAUDE.md

Guía para trabajar en este repositorio con Claude Code.

## Qué es este proyecto

Módulo de soporte de un e-commerce con IA y agentes humanos. Un cliente describe su
problema; un RAG (LangChain + Redis + OpenAI/Anthropic) responde usando los manuales de
soporte como base de conocimiento, y si no alcanza, un agente humano lo atiende a través
de un hilo de mensajes por ticket.

**Estado actual:** modelo de datos completo, persistencia real en PostgreSQL, RAG real
sobre Redis conectado a la creación de tickets, y **autenticación/autorización reales**
(JWT + bcrypt + 2 roles) protegiendo todos los endpoints de tickets — ver
[Autenticación (JWT)](#autenticación-jwt).

## Cómo levantar el entorno

```bash
docker compose up --build
```

- Frontend: http://localhost:3000 (redirige a `/login`)
- Backend: http://localhost:3001/api/v1
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Necesita 3 archivos `.env` (cada uno con su `.env.example`, copiar antes del primer
`up`): `backend/.env`, `frontend/.env`, y **`.env` en la raíz** — este último solo trae
`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, separado a propósito de
`backend/.env`: el servicio `postgres` de `docker-compose.yml` lo lee vía `env_file` para
no recibir las API keys/secretos JWT de `backend/.env` (menor privilegio — si se
compromete el contenedor de Postgres, no expone secretos que no usa) ni tenerlos
hardcodeados en el propio compose file. El servicio `backend` lee ambos archivos (sus
propias variables + estas credenciales, que debe usar para conectarse a la misma base).

Los `volumes` en `docker-compose.yml` montan el código fuente dentro de los contenedores,
así que los cambios en `backend/src` y `frontend/` se reflejan con hot-reload sin
reconstruir la imagen. Solo reconstruye (`--build`) si cambias `package.json` o los
Dockerfiles.

Al arrancar, el backend (todo idempotente, seguro de re-ejecutar en cada restart del
watch mode):
1. Corre las migraciones pendientes (`migrationsRun: true` en `typeorm.config.ts`).
2. Indexa los manuales (`MANUALS_CONTENT`) como vectores en Redis si el índice todavía
   está vacío (`ManualsIndexingService`) — necesita `AI_API_KEY`/`OPENAI_API_KEY`; si
   falta, lo loguea como warning y sigue arrancando sin RAG funcional (fallback
   controlado).

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

## RAG + clasificación (LangChain + Redis + OpenAI/Anthropic)

`CreateTicketUseCase` depende de UN solo puerto de dominio,
`TicketAiAnalysisPort` (`domain/tickets/ticket-ai-analysis.port.ts`), que retorna
`{ category, aiSuggestedResponse, confidenceScore }` — el resultado completo del
análisis de IA de un ticket. Tiene **dos implementaciones intercambiables (patrón
Strategy)**, seleccionadas por `AI_ANALYSIS_STRATEGY`:

- **`structured`** (default) — `StructuredOutputTicketAiAnalysisStrategy`
  (`infrastructure/knowledge-base/ticket-analysis/`): un único llamado al modelo de
  chat con Structured Output/function calling (`chatModel.withStructuredOutput(schema)`
  de `@langchain/core`) que devuelve los 3 campos juntos en un JSON. `confidence_score`
  sale de que el modelo se **autoevalúe** (suele ser más "generoso" que el heurístico de
  distancia — en pruebas, 1.0 vs ~0.77 para el mismo texto).
- **`separate`** — `SeparateCallsTicketAiAnalysisStrategy`: el diseño original, envuelve
  `RagQueryPort` (`LangchainRagService`, búsqueda vectorial + generación, confidence de
  la distancia) y `TicketClassifierPort` (`TicketClassifierService`, clasificación en un
  llamado aparte) corriendo en paralelo con `Promise.all`.

La selección de estrategia se hace en `KnowledgeBaseModule` con un provider
`useFactory` que lee `loadAiConfig(configService).analysisStrategy` — ambas estrategias
se registran siempre como providers, se instancia solo la que gane. Para agregar una
tercera estrategia: implementar `TicketAiAnalysisPort`, registrarla como provider, y
sumarla al `useFactory`.

Independientemente de la estrategia, `ManualsIndexingService.indexManuals()` indexa en
Redis (`RedisVectorStore` de `@langchain/redis`) el texto de `MANUALS_CONTENT`
(`manuals.data.ts`) directamente — no hay PDF ni ningún otro artefacto intermedio, el
contenido vive solo como datos TypeScript. **Un chunk por punto numerado** (ya vienen
separados así en el array `contenido` de cada manual), no por cantidad de caracteres —
chunks más grandes (todo el manual junto) diluían la similitud de la búsqueda vectorial
(con eso, ni una frase casi textual del manual pasaba de ~0.69 de score; con chunks finos
llega a ~0.77+). `KnowledgeBaseBootstrapService` (`OnApplicationBootstrap`, con
try/catch: un fallo acá nunca debe tumbar el arranque del backend) dispara la indexación.

**`CreateTicketUseCase`** decide el `status`/contenido visible al cliente comparando
`confidenceScore` contra `AI_CONFIDENCE_THRESHOLD` (default `0.7`, env var) — ver esa
lógica y sus comentarios ahí, no en las estrategias (es una regla de negocio, no de IA).

**Sin `AI_API_KEY`/`OPENAI_API_KEY` configuradas, todo sigue funcionando**: cada
implementación (`VectorStoreProvider.getStore()`, ambas estrategias) detecta la
ausencia de key y degrada con gracia (logs de warning + un análisis de fallback con
`confidenceScore: 0`), en vez de tirar la app abajo. Mantené este patrón si tocás este
código.

**Gotcha real de este repo — versiones de LangChain JS**: el ecosistema `@langchain/*`
tiene versiones mutuamente incompatibles circulando a la vez (`@langchain/community`
quedó atascado en peer-deps viejas de `langchain@0.3.x`, mientras `@langchain/core`,
`@langchain/openai`, `@langchain/anthropic` y `@langchain/redis` ya están en la línea
`1.x`). Por eso este proyecto **no usa** `@langchain/community` ni el paquete `langchain`
sin scope — el chunking de los manuales se hace con código propio muy simple, directo en
`ManualsIndexingService` (un chunk por punto numerado, ver arriba), sin necesitar
`RecursiveCharacterTextSplitter` ni ningún loader de esa librería. Si vas a agregar otro
paquete `@langchain/*`, verificá con `npm view <paquete> peerDependencies` que la versión
de `@langchain/core` que pide sea compatible con la que ya está instalada
(`npm view @langchain/core version` para la última), en vez de asumir que el número de
versión que se te ocurra va a resolver bien.

Variables de entorno relevantes (`backend/.env`): `AI_PROVIDER`, `AI_API_KEY`,
`AI_MODEL`, `OPENAI_API_KEY` (embeddings, siempre OpenAI), `EMBEDDINGS_MODEL`,
`REDIS_URL`, `REDIS_INDEX_NAME`, `AI_ANALYSIS_STRATEGY` (`structured`|`separate`),
`AI_CONFIDENCE_THRESHOLD` (0-1). Detalle de cada una en README.md.

## Autenticación (JWT)

Login/refresh/logout reales con JWT + bcrypt. **2 roles**: `admin` y `user` (columna
`roles.name`, migración `AddAuthCredentials` resembró los 3 roles viejos —
Cliente/Agente/Admin— a estos 2).

- `domain/auth/`: `UserRole` enum, puerto `AuthUserRepository` (`findByEmail`,
  `findById`, `setRefreshTokenHash`), puerto `TokenService` (`generateTokens`,
  `verifyRefreshToken`).
- `application/auth/use-cases/`: `LoginUseCase` (verifica password con bcrypt, emite
  tokens, guarda el hash del refresh token), `RefreshTokenUseCase` (verifica + rota: el
  refresh token usado queda invalidado, se emite un par nuevo), `LogoutUseCase` (limpia
  el hash → revoca la sesión).
- `application/auth/refresh-token-hash.util.ts`: hashea el refresh token con **SHA-256**,
  no bcrypt. Bcrypt trunca inputs a 72 bytes, y los JWT (refresh tokens) comparten un
  prefijo casi idéntico entre sí (mismo header/claims iniciales) — bcrypt-hashearlos
  colisionaba y rompía la invalidación al rotar. El refresh token ya es opaco/aleatorio,
  no necesita el hash lento+salado de bcrypt (eso sí se usa para `password_hash`, que es
  la contraseña elegida por un humano).
- `infrastructure/auth/jwt-token.service.ts` (`JwtTokenService`): implementa
  `TokenService` con `@nestjs/jwt`. Access y refresh usan **secretos y expiraciones
  distintos** (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` 15m
  default, `JWT_REFRESH_EXPIRES_IN` 7d default).
- `infrastructure/http/auth/`: `strategies/jwt.strategy.ts` (Passport, valida el access
  token y re-consulta al usuario por id para no confiar ciegamente en el payload),
  `guards/jwt-auth.guard.ts` (autenticación: `@UseGuards(JwtAuthGuard)`),
  `guards/roles.guard.ts` + `decorators/roles.decorator.ts` (autorización:
  `@Roles(UserRole.ADMIN)`), `decorators/current-user.decorator.ts` (`@CurrentUser()`
  lee `request.user`), `auth.controller.ts` (`POST /auth/login|refresh-token|logout`),
  `auth.module.ts`.
- `infrastructure/persistence/typeorm/repositories/auth-user.typeorm-repository.ts`:
  implementa `AuthUserRepository` sobre `UserTypeOrmEntity` (columnas `password_hash`,
  `refresh_token_hash`).

**Simplificación deliberada**: una sola sesión activa por usuario (el hash del refresh
token vigente vive en la misma fila de `users`, no en una tabla aparte de sesiones). Un
login nuevo invalida cualquier refresh token anterior de ese usuario. Si se necesita
multi-sesión (varios dispositivos activos a la vez), hay que migrar a una tabla
`refresh_tokens` con un hash por sesión.

`TicketsController` es el ejemplo de cómo proteger un endpoint: guard de clase
`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.USER | UserRole.ADMIN)` por
ruta + `@CurrentUser()` en vez de un id inventado.

**Frontend** (`frontend/lib/auth.ts`): `login()`/`logout()` llaman al backend real;
`accessToken`/`refreshToken` se guardan en `localStorage`. El JWT lleva `name` en el
payload (además de `sub`/`email`/`role`) específicamente para que el frontend pueda
armar la sesión completa decodificando el token, sin necesitar un endpoint `/auth/me`
aparte. `lib/api.ts` centraliza los requests en `authFetch`: agrega el `Bearer`, y si el
backend responde 401 intenta renovar una vez con el refresh token antes de reintentar (o
manda a `/login` si el refresh también falla). `useAuthGuard` hace lo mismo al entrar a
una página protegida (el access token dura poco, 15m).

Variables de entorno (`backend/.env`): `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`,
`JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`. Los secretos deben ser distintos entre sí
y aleatorios (`openssl rand -hex 32`) en cualquier ambiente real.

## Arquitectura del backend

NestJS con **arquitectura hexagonal a nivel de raíz** (no por módulo/feature primero):

```
backend/src/
  domain/
    tickets/               # Entidad Ticket, TicketStatus/TicketCategory, puertos
                            # (TicketRepository, TicketAiAnalysisPort, TicketClassifierPort)
    messages/               # Entidad Message, MessageSenderType, puerto MessageRepository
    knowledge-base/         # Puerto RagQueryPort
    auth/                  # UserRole enum, puertos AuthUserRepository y TokenService
    common/                 # AuditableFields (contrato de campos de auditoría)
  application/
    tickets/use-cases/      # CreateTicket, ListTickets, SendMessage, UpdateTicketStatus
    auth/use-cases/          # Login, RefreshToken, Logout
    auth/refresh-token-hash.util.ts  # Hash SHA-256 del refresh token (ver sección Auth)
  infrastructure/
    http/
      tickets/               # Controller y DTOs (adaptador de entrada)
      auth/                  # AuthController/AuthModule/DTOs, guards (Jwt/Roles),
                              # decoradores (@Roles/@CurrentUser), estrategia Passport
      guards/                # PromptSafetyGuard (defensa anti prompt-injection, reusable)
    auth/
      jwt-token.service.ts   # Implementa TokenService con @nestjs/jwt
    ai/                      # ai-config, AiModelFactory, PromptSafetyCheckerService
    knowledge-base/
      manuals.data.ts        # Contenido de los manuales por categoría (texto, sin PDF)
      knowledge-base-bootstrap.service.ts  # Dispara la indexación al arrancar
      ticket-classifier.service.ts   # Implementa TicketClassifierPort
      ticket-analysis/        # Las 2 estrategias de TicketAiAnalysisPort (ver RAG arriba)
      rag/                    # vector-store, indexing, LangchainRagService (RagQueryPort)
    persistence/typeorm/
      entities/              # Entidades TypeORM (User -incl. password_hash/refresh_token_hash-,
                              # Role, Permission, RolePermission, Ticket, Message)
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

### Gotcha de Docker: `restart` no relee `.env`

`docker compose restart backend` reinicia el proceso del contenedor pero **no vuelve a
leer** `backend/.env` ni el `.env` de la raíz (`env_file` se aplica solo al crear el
contenedor). Si cambiás una variable de entorno (ej. `AI_ANALYSIS_STRATEGY`,
`AI_PROVIDER`, `POSTGRES_PASSWORD`, cualquier cosa en cualquiera de los dos `.env`),
`restart` sigue usando los valores viejos — hay que recrear el contenedor con
`docker compose up -d --force-recreate backend` (o `up -d` a secas, que a veces alcanza)
para que tome el cambio. Si cambiás una env var y el comportamiento no cambia, esta es la
primera sospecha.

## Arquitectura del frontend

Next.js App Router + TailwindCSS, todo en TypeScript.

```
frontend/
  app/
    page.tsx        # Redirige a /login o /cliente|/admin según la sesión
    login/page.tsx   # Login real (dropdown de 2 usuarios demo + password) contra /auth/login
    cliente/page.tsx  # Formulario de creación de ticket + respuesta de la IA
    admin/page.tsx    # Tabla de tickets + acciones (Cerrar / Reasignar a Humano)
  components/
    TicketForm.tsx         # Formulario de creación (usado en /cliente)
    AdminTicketsTable.tsx   # Tabla con estado/categoría/confianza/acciones (usado en /admin)
  lib/
    api.ts            # Cliente HTTP hacia el backend — authFetch agrega el Bearer y
                       # reintenta una vez con refresh automático si el backend da 401
    auth.ts            # Login/logout reales (POST /auth/login|logout) + sesión decodificada
                       # del JWT, tokens en localStorage
    use-auth-guard.ts   # Hook que protege /cliente y /admin: valida el JWT (con refresh si
                       # venció) y redirige a /login si no hay sesión o el rol no coincide
    labels.ts           # Labels/colores de status y categoría para la UI
```

El fetch al backend ocurre en el navegador del usuario (no dentro del contenedor), por
eso `NEXT_PUBLIC_API_URL` en `frontend/.env` apunta a `http://localhost:3001/api/v1`
(el puerto expuesto en el host), no a `http://backend:3001` (solo resoluble dentro de la
red de Docker).

`useAuthGuard('user' | 'admin')` es un hook simple, no un middleware de Next — cada
página protegida lo llama y hace su propio `redirect` a `/login` si no hay sesión o el
rol no coincide. La sesión sí es real (JWT validado por el backend en cada request vía
`authFetch`); el guard del lado del cliente es solo UX (evitar el flash de contenido
protegido) — la autorización de verdad la hacen `JwtAuthGuard`/`RolesGuard` en el
backend.

## Convenciones

- Todo el código y comentarios del proyecto en español (mensajes de usuario, DTOs,
  labels), identificadores de código en inglés.
- No agregar abstracciones para casos hipotéticos futuros (feature flags, capas extra)
  hasta que el requisito exista.
- Sin tests todavía — no hay convención establecida aún.
- **No hacer `git commit` sin que el usuario lo pida explícitamente para ese cambio
  puntual**, aunque haya pedido la feature que originó el cambio. Dejar el trabajo en el
  working tree para que lo revise antes de comitear. Esto aplica incluso en tareas
  largas de varios pasos: no comitear "al terminar" por iniciativa propia.

## Próximos pasos conocidos

1. Endpoints y casos de uso de gestión de usuarios/roles/permisos (alta de usuarios,
   cambio de contraseña, etc. — hoy solo existen los 2 usuarios demo sembrados por
   migración).
2. Autorización fina por permisos (`Permission`/`RolePermission` siguen sin usarse; hoy
   la autorización es solo por rol vía `@Roles()`).
3. Multi-sesión: si hace falta, migrar el refresh token de una columna en `users` a una
   tabla `refresh_tokens` (ver simplificación documentada en Autenticación (JWT)).
4. Clasificación automática de `category` por IA (hoy sigue quemada en `GENERAL`; solo
   la respuesta sugerida usa el RAG real).
5. Mensajes de seguimiento del cliente: deshabilitado a propósito para esta demo (se
   quitó `POST /tickets/:id/messages`; `SendMessageForm` en `/cliente/:id` muestra "no
   disponible" en vez de un formulario funcional). El endpoint de agente
   (`POST /tickets/:id/agent-messages`) sigue activo. Si se reactiva, agregar de nuevo
   el endpoint de cliente con su guard/rol (`UserRole.USER`) y volver a conectar la UI.
6. Calibrar `confidence_score` (hoy es un heurístico simple de distancia vectorial).

No implementar estos puntos de forma preventiva — se abordarán en iteraciones
posteriores, uno a la vez.
