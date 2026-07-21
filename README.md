# ImagineApps — Módulo de Soporte

Módulo para gestionar el soporte de un e-commerce con IA y agentes humanos. Un usuario
describe su problema, el sistema lo clasifica y responde (por IA o derivándolo a un
agente humano).

Este repositorio es la **base del proyecto**: backend y frontend dockerizados, comunicados
mediante 2 endpoints REST con datos quemados en memoria. Todavía no hay integración de IA
ni persistencia real en base de datos.

## Stack

**Backend** (`backend/`)
- Node.js + NestJS + TypeScript
- TypeORM + PostgreSQL (conexión lista, aún sin entidades persistidas)
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

## Endpoints actuales

Todos los datos viven en un arreglo en memoria (`InMemoryTicketRepository`), se reinician
cada vez que el contenedor del backend se reinicia.

### `POST /api/v1/tickets`

Crea un ticket a partir de la descripción del problema.

```json
// Request
{ "description": "No he recibido mi pedido" }

// Response
{
  "id": "uuid",
  "description": "No he recibido mi pedido",
  "status": "PENDIENTE_AGENTE",
  "category": "GENERAL",
  "suggestedResponse": "Un agente revisará tu caso y te responderá a la brevedad.",
  "createdAt": "2026-07-20T10:00:00.000Z"
}
```

### `GET /api/v1/tickets?page=1&limit=10`

Retorna la lista paginada de tickets, con su estado (`RESUELTO_IA` / `PENDIENTE_AGENTE`),
categoría asignada y respuesta sugerida.

```json
{
  "items": [ /* tickets */ ],
  "total": 6,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

> Nota: por ahora el estado, la categoría y la respuesta sugerida son valores quemados —
> la clasificación real con IA se integrará más adelante.

## Estructura del backend (arquitectura hexagonal)

```
backend/src/
  domain/           # Entidades y puertos (interfaces), sin dependencias externas
  application/      # Casos de uso, orquestan el dominio a través de los puertos
  infrastructure/   # Adaptadores: HTTP (controllers), persistencia, configuración
  app.module.ts      # Composición: conecta infraestructura con el resto
  main.ts
```

## Próximos pasos

- Persistir tickets en PostgreSQL vía TypeORM (reemplazar el repositorio en memoria).
- Integrar clasificación y respuesta automática con IA.
- Autenticación y roles (usuario, agente).
- Vista/flujo para agentes humanos.

Ver [CLAUDE.md](./CLAUDE.md) para más contexto de trabajo con Claude Code en este repo.
