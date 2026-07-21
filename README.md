# ImagineApps — Módulo de Soporte

Módulo para gestionar el soporte de un e-commerce con IA y agentes humanos. Un cliente
describe su problema, un RAG (LangChain + Redis + OpenAI/Anthropic) responde usando los
manuales internos como base de conocimiento, y si no alcanza, un agente humano lo atiende
a través de un hilo de mensajes.

Persistencia real en PostgreSQL, RAG real sobre Redis, y **autenticación/autorización
reales** (JWT + bcrypt, 2 roles) ya están conectados de punta a punta — ver
[Autenticación (JWT)](#autenticación-jwt).

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
- Login real (JWT) + vista de cliente (crear ticket) + panel de administrador/agente

**Infraestructura**
- Docker Compose con hot-reload (volúmenes montados) para desarrollo

## Requisitos

- Docker y Docker Compose
- (Opcional, para respuestas de IA reales) una API key de OpenAI y/o Anthropic

## Cómo levantar el proyecto

1. Copia los archivos de variables de entorno de ejemplo (si no existen ya):

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   El `.env` de la raíz solo tiene las credenciales de Postgres (`POSTGRES_USER`/
   `POSTGRES_PASSWORD`/`POSTGRES_DB`) — el servicio `postgres` de
   `docker-compose.yml` las lee de ahí en vez de tenerlas hardcodeadas en el
   propio compose file, y separadas de `backend/.env` para que el contenedor de
   Postgres no reciba API keys/secretos de JWT que no necesita.

2. (Opcional) Completa `AI_API_KEY` en `backend/.env` para que el RAG responda de verdad
   — ver [IA / RAG](#ia--rag). Sin key, la app funciona igual, pero el mensaje de IA de
   cada ticket queda como un texto fijo indicando que la IA no está configurada.

3. Levanta todo con Docker Compose:

   ```bash
   docker compose up --build
   ```

   Al arrancar, el backend: corre las migraciones pendientes (schema + seed de roles,
   permisos y 2 usuarios demo), e indexa los manuales como vectores en Redis si el índice
   todavía está vacío. Todo idempotente — reiniciar el contenedor no repite trabajo ya
   hecho.

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

Login real en `/login` (dos usuarios de prueba, contraseña `password` para ambos):

| Usuario                          | Rol     | Redirige a |
|-----------------------------------|---------|------------|
| `cliente.demo@imagineapps.test`   | `user`  | `/cliente` |
| `admin.demo@imagineapps.test`     | `admin` | `/admin`   |

- **`/cliente`**: formulario para describir un problema. Al enviarlo, muestra la
  respuesta que generó la IA (RAG) y su `confidence_score`.
- **`/admin`**: tabla paginada de todos los tickets, con su categoría, el
  `confidence_score` del mensaje de IA, y botones **Cerrar Ticket**
  (`status → RESUELTO_AGENTE`) y **Reasignar a Humano** (`status → PENDIENTE_AGENTE`).

El login llama a `POST /auth/login` y guarda el `accessToken`/`refreshToken` reales en
`localStorage`; cada request al backend lleva el `accessToken` como `Bearer`, y si vence
(dura 15 min) se renueva automáticamente con el `refreshToken` antes de reintentar. `/` y
`/admin` redirigen a `/login` si no hay una sesión válida — ver
[Autenticación (JWT)](#autenticación-jwt).

## Modelo de datos

```
User ---- role_id ----> Role ----< RolePermission >---- Permission
 |
 | creatorId/updaterId (todas las tablas)
 v
Ticket (description, status, category) ---< Message (senderType, content, suggestedResponse, confidenceScore)
```

- **User / Role / Permission / RolePermission**: base RBAC. Un `User` tiene un único
  `Role` (`admin` o `user`); un `Role` tiene muchos `Permission` a través de
  `RolePermission` (esta tabla existe en el esquema pero todavía no se usa — la
  autorización hoy es solo por rol, no por permiso fino). `User` también tiene
  `password_hash` y `refresh_token_hash` para la autenticación real. Todavía no hay
  endpoints de gestión de usuarios — solo los 2 usuarios demo sembrados por migración.
- **Ticket**: el problema reportado. `status` puede ser `RESOLVIENDO_IA`, `RESUELTO_IA`,
  `PENDIENTE_AGENTE`, `RESOLVIENDO_AGENTE` o `RESUELTO_AGENTE`.
- **Message**: el hilo de conversación de un ticket (respuesta de IA, mensajes del
  cliente, mensajes de un agente). `senderType` es `CLIENTE`, `IA` o `AGENTE`.
  `suggestedResponse` + `confidenceScore` solo se llenan en mensajes de IA (vienen del RAG).

Todas las tablas comparten las columnas de auditoría mínimas: `id`, `createdAt`,
`updatedAt`, `creatorId`, `updaterId` (ver `AuditableBaseEntity`).

## IA / RAG

Al crear un ticket, `CreateTicketUseCase` le pregunta a `TicketAiAnalysisPort` (un solo
puerto de dominio) por `{ category, aiSuggestedResponse, confidenceScore }`, usando los
manuales de soporte (texto por categoría en `manuals.data.ts`, sin PDF de por medio) como
base de conocimiento. Hay **dos estrategias intercambiables** para resolver ese puerto
(patrón Strategy), elegidas por `AI_ANALYSIS_STRATEGY`:

- **`structured`** (default): un único llamado al modelo con *Structured Output/function
  calling*, que devuelve categoría + respuesta + confianza juntos en un JSON. La
  confianza sale de que el modelo se autoevalúa.
- **`separate`**: el diseño original — búsqueda vectorial + generación de respuesta por
  un lado (confianza = similitud de la búsqueda), clasificación de categoría por otro
  lado (otro llamado al modelo), corriendo en paralelo.

En ambos casos, los manuales se indexan en Redis como vectores (embeddings) al arrancar
el backend, con un chunk por punto/consejo del manual (no todo el manual junto, para no
diluir la similitud de la búsqueda).

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

AI_ANALYSIS_STRATEGY=structured   # "structured" (default) o "separate"
AI_CONFIDENCE_THRESHOLD=0.7        # a partir de qué confianza el ticket queda RESOLVIENDO_IA
```

**Sin `AI_API_KEY` configurada, la app no se rompe**: cada estrategia detecta que falta
la key, lo loguea como warning, y devuelve un análisis de fallback con
`confidenceScore: 0` ("La IA todavía no está configurada..."). Esto se puede ver en los
logs del backend al arrancar (`RAG deshabilitado: falta configurar la API key de
embeddings...`).

> Si cambiás una variable en `backend/.env` mientras el stack ya está corriendo,
> `docker compose restart backend` **no alcanza** (no vuelve a leer `.env`) — usá
> `docker compose up -d --force-recreate backend`.

## Autenticación (JWT)

Login/refresh/logout reales, con **2 roles**: `admin` y `user`.

- Cliente demo: `cliente.demo@imagineapps.test` (rol `user`) — id
  `11111111-1111-1111-1111-111111111111`.
- Admin demo: `admin.demo@imagineapps.test` (rol `admin`) — id
  `22222222-2222-2222-2222-222222222222`.
- Contraseña de ambos: `password`.

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.demo@imagineapps.test","password":"password"}'
# → { "accessToken": "...", "refreshToken": "..." }

# Usar el access token en cualquier endpoint protegido
curl http://localhost:3001/api/v1/tickets \
  -H "Authorization: Bearer <accessToken>"

# Renovar (rota el refresh token: el usado queda invalidado)
curl -X POST http://localhost:3001/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

# Logout (revoca el refresh token vigente)
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

Todos los endpoints de `/tickets` requieren `Authorization: Bearer <accessToken>`
(`JwtAuthGuard`) y el rol correcto (`RolesGuard` + `@Roles(...)`): las rutas de "mis
casos"/crear ticket/enviar mensaje son de rol `user`; listar todos los tickets, ver el
detalle de cualquiera, responder como agente y cambiar el estado son de rol `admin`.

**Simplificación deliberada**: una sola sesión activa por usuario — el hash del refresh
token vigente vive en la misma fila de `users` (columna `refresh_token_hash`), no en una
tabla aparte de sesiones. Un login nuevo invalida cualquier refresh token anterior de ese
usuario. El hash usa SHA-256 (no bcrypt: bcrypt trunca a 72 bytes y los JWT son más
largos y comparten prefijo entre sí, lo que rompía la invalidación al rotar).

Variables de entorno nuevas en `backend/.env`: `JWT_ACCESS_SECRET`,
`JWT_ACCESS_EXPIRES_IN` (15m default), `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` (7d
default). Los secretos deben ser aleatorios y distintos entre sí
(`openssl rand -hex 32`) en cualquier ambiente real — los de `.env.example` vienen
vacíos a propósito.

## Endpoints actuales

> Todos los endpoints de `/tickets` (abajo) requieren `Authorization: Bearer
> <accessToken>` — ver [Autenticación (JWT)](#autenticación-jwt) para cómo obtenerlo.

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

### `POST /api/v1/tickets/:id/agent-messages`

Agrega un mensaje de un agente/admin al hilo de un ticket existente. Rol `admin`.

```json
// Request
{ "content": "Ya estamos revisando tu caso." }
```

> No existe un endpoint para que el cliente agregue mensajes de seguimiento — está
> deshabilitado a propósito para esta demo (ver [Autenticación (JWT)](#autenticación-jwt)
> y la UI de `/cliente/:id`, que muestra "Enviar mensajes no está disponible en esta
> demo." en vez de un formulario funcional).

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
    http/           # Controllers, DTOs, guards/decoradores de auth JWT reales
    auth/            # JwtTokenService (implementación del puerto TokenService)
    knowledge-base/  # Contenido de los manuales (texto) + pipeline RAG (LangChain/Redis)
    persistence/typeorm/
      entities/     # Entidades TypeORM (mapeo a tablas)
      repositories/ # Implementaciones de los puertos del dominio
      migrations/   # Migraciones versionadas del esquema
  app.module.ts      # Composición: conecta infraestructura con el resto
  main.ts
```

## DevOps, Infraestructura y Seguridad

Hoy todo corre en Docker Compose (desarrollo local). Esta sección es un plan
concreto para llevarlo a AWS sin rediseñar la app — cada contenedor de
`docker-compose.yml` mapea a un servicio gestionado.

### Servicios de AWS por componente

| Componente actual (Docker Compose)                       | Servicio en AWS                                                            | Notas                                                                 |
|------------------------------------------------------------|-----------------------------------------------------------------------------|------------------------------------------------------------------------|
| `frontend` (Next.js)                                       | ECS Fargate + ALB, detrás de CloudFront                                    | Mismo Dockerfile (build de producción); CloudFront cachea assets y termina TLS |
| `backend` (NestJS)                                          | ECS Fargate + ALB (interno)                                                | Mismo Dockerfile; auto scaling por CPU/request count                  |
| `postgres`                                                  | RDS for PostgreSQL (Multi-AZ)                                              | Backups automáticos, encryption at rest                                |
| `redis` (Redis Stack, necesita RediSearch)                  | Sin equivalente directo en ElastiCache — ver gotcha abajo                  | Self-host en EC2/ECS, o migrar el vector store a pgvector/OpenSearch    |
| Imágenes Docker                                             | Amazon ECR                                                                 | Build en CI, push por tag/SHA                                          |
| `backend/.env` / `.env` (raíz)                              | AWS Secrets Manager o SSM Parameter Store (SecureString)                   | Nunca como variables planas en la task definition                      |
| DNS                                                         | Route 53                                                                   | `app.dominio.com` → CloudFront, `api.dominio.com` → ALB del backend    |
| Certificados TLS                                            | AWS Certificate Manager (ACM)                                              | En el ALB y en CloudFront                                               |
| Logs y métricas                                             | CloudWatch Logs + Alarms                                                   | Un log group por servicio de ECS                                       |
| CI/CD                                                       | GitHub Actions → build/push a ECR → `ecs update-service` (o CodePipeline)  |                                                                          |
| Infraestructura como código                                 | Terraform o AWS CDK                                                        | Reproducible entre ambientes (dev/staging/prod)                        |

### Plan de despliegue (resumen)

1. **Red**: VPC con subnets públicas (solo ALB/NAT) y privadas (ECS, RDS, Redis).
   NAT Gateway para que el backend llegue a las API de OpenAI/Anthropic.
2. **Imágenes**: build de `backend`/`frontend` en modo producción (no el
   `Dockerfile.dev` de hot-reload) y push a ECR.
3. **Datos**: levantar RDS PostgreSQL (Multi-AZ) y correr las migraciones
   (`npm run migration:run`) como paso del pipeline, no a mano.
4. **Vector store**: resolver Redis Stack self-hosted vs. pgvector/OpenSearch
   (ver gotcha) antes de indexar los manuales en el ambiente nuevo.
5. **Secretos**: `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (rotados, nunca los
   de `.env.example`), `AI_API_KEY`/`OPENAI_API_KEY` y credenciales de RDS van
   a Secrets Manager, referenciados desde las task definitions de ECS.
6. **Cómputo**: task definitions de Fargate para `backend`/`frontend`, ALB con
   path-based routing (o uno por servicio), auto scaling por CPU/memoria o
   request count.
7. **Borde**: CloudFront delante del frontend + ACM para TLS + Route 53 para
   el DNS.
8. **Observabilidad**: logs de contenedor a CloudWatch, alarms básicas (5xx
   del ALB, CPU/memoria de las tasks, conexiones de RDS).

### Gotcha real de esta migración — Redis Stack no tiene equivalente gestionado

El RAG depende de **RediSearch** (búsqueda vectorial), que trae
`redis-stack-server`, no el Redis vanilla. **Amazon ElastiCache no soporta
módulos de Redis** (ni RediSearch ni ningún otro), así que no es un reemplazo
directo. Dos caminos reales al migrar:
- Self-hostear Redis Stack en EC2 o como tarea de ECS con volumen EBS/EFS
  persistente (parecido a lo que corre hoy, pero hay que operarlo: backups,
  parches, alta disponibilidad manual).
- Reemplazar `VectorStoreProvider`/`RedisVectorStore` por un backend con
  equivalente gestionado: **pgvector** como extensión de la misma RDS
  PostgreSQL (un solo motor de datos, sin infraestructura nueva) o **Amazon
  OpenSearch Service** (k-NN nativo). Cualquiera de las dos cambia la
  implementación de `RagQueryPort`/`ManualsIndexingService`, no el dominio.

### Seguridad

- **Secretos**: nunca en la imagen ni en variables de entorno planas de la
  task definition — Secrets Manager/SSM, inyectados en runtime. Rotación
  periódica de `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` y credenciales de RDS.
- **Red**: security groups por capa — el ALB acepta 443 desde internet; ECS
  solo acepta tráfico del security group del ALB; RDS y Redis solo aceptan
  tráfico del security group de ECS (nunca expuestos a internet).
- **IAM**: task role por servicio con permisos mínimos (ej. el backend solo
  puede leer los secretos que efectivamente usa, no todos los del proyecto).
- **TLS en tránsito**: ACM en ALB/CloudFront; conexión a RDS forzando SSL
  (`sslmode=require`).
- **Cifrado en reposo**: RDS y los volúmenes de Redis Stack (si es
  self-hosted) con encryption at rest habilitado.
- **WAF**: AWS WAF delante de CloudFront/ALB (rate limiting, reglas
  administradas) como capa adicional a las defensas que ya existen en la app
  (`PromptSafetyGuard` contra prompt injection, guards de auth/rol).
- **Backups**: snapshots automáticos de RDS; si Redis Stack es self-hosted,
  snapshots del volumen EBS/EFS (los vectores se pueden re-indexar desde
  `MANUALS_CONTENT`, pero no conviene depender de eso como estrategia de
  recuperación).

## Próximos pasos

- Endpoints de gestión de usuarios/roles/permisos (alta de usuarios, cambio de
  contraseña — hoy solo existen los 2 usuarios demo).
- Autorización fina por permisos (`Permission`/`RolePermission` siguen sin usarse).
- Categorización automática del ticket por IA (hoy `category`/`status` inicial siguen
  quemados; solo la respuesta sugerida usa el RAG real).
- Mensajes de seguimiento del cliente (deshabilitado a propósito para esta demo, ver
  nota en `POST /tickets/:id/agent-messages` arriba).
- Desplegar en AWS siguiendo el plan de
  [DevOps, Infraestructura y Seguridad](#devops-infraestructura-y-seguridad) — hoy el
  proyecto solo corre en Docker Compose local.

Ver [CLAUDE.md](./CLAUDE.md) para más contexto de trabajo con Claude Code en este repo.
