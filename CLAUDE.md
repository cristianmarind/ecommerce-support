# CLAUDE.md

Guía para trabajar en este repositorio con Claude Code.

## Qué es este proyecto

Módulo de soporte de un e-commerce con IA y agentes humanos. Un usuario describe su
problema; el sistema (a futuro) lo clasifica con IA y responde automáticamente o lo deriva
a un agente humano.

**Estado actual:** solo la base del proyecto. Backend y frontend dockerizados,
comunicados con 2 endpoints REST cuyos datos están quemados en un arreglo en memoria.
No hay IA ni persistencia real todavía.

## Cómo levantar el entorno

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/v1
- PostgreSQL: localhost:5432 (levantado, pero aún sin entidades persistidas)

Los `volumes` en `docker-compose.yml` montan el código fuente dentro de los contenedores,
así que los cambios en `backend/src` y `frontend/` se reflejan con hot-reload sin
reconstruir la imagen. Solo reconstruye (`--build`) si cambias `package.json` o los
Dockerfiles.

## Arquitectura del backend

NestJS con **arquitectura hexagonal a nivel de raíz** (no por módulo/feature primero):

```
backend/src/
  domain/tickets/          # Entidades, enums y puertos (interfaces de repositorio)
  application/tickets/     # Casos de uso (use-cases), orquestan el dominio
  infrastructure/
    http/tickets/          # Controllers y DTOs (adaptador de entrada)
    persistence/in-memory/ # Adaptador de salida actual (arreglo en memoria)
    config/                # Configuración de TypeORM/PostgreSQL
```

Reglas a mantener al extender esto:

- `domain/` no importa nada de `application/` ni `infrastructure/`. Solo entidades,
  enums y contratos (interfaces/puertos).
- `application/` depende de `domain/` (a través de los puertos, inyectados por token,
  ej. `TICKET_REPOSITORY`), nunca de una implementación concreta de infraestructura.
- `infrastructure/` implementa los puertos del dominio (controllers, repositorios
  concretos, configuración) y es lo único que conoce frameworks/librerías externas
  (Nest, TypeORM, Express).
- Al agregar un nuevo agregado (ej. "agentes", "conversaciones"), replicar el mismo
  patrón de subcarpetas dentro de `domain/`, `application/` e `infrastructure/`.

TypeORM ya está conectado a PostgreSQL (`infrastructure/config/typeorm.config.ts`), pero
`TicketsModule` sigue usando `InMemoryTicketRepository` como implementación del puerto
`TicketRepository`. Migrar a persistencia real implica: crear la entidad TypeORM, un
nuevo repositorio que implemente `TicketRepository`, y cambiar el `provide` en
`tickets.module.ts` — el dominio y los casos de uso no deberían cambiar.

## Arquitectura del frontend

Next.js App Router + TailwindCSS, todo en TypeScript.

```
frontend/
  app/                # Rutas (App Router). page.tsx es el dashboard de soporte
  components/         # Componentes de UI (TicketForm, TicketsTable, TicketsDashboard)
  lib/                # Cliente API (api.ts) y labels de estado/categoría (labels.ts)
```

`TicketsDashboard` es el componente cliente que orquesta el formulario de creación y la
tabla paginada, llamando a `backend` vía `NEXT_PUBLIC_API_URL` (definido en
`frontend/.env`, apunta a `http://localhost:3001/api/v1` porque el fetch ocurre en el
navegador del usuario, no dentro del contenedor).

## Convenciones

- Todo el código y comentarios del proyecto en español (mensajes de usuario, DTOs,
  labels), identificadores de código en inglés.
- No agregar abstracciones para casos hipotéticos futuros (feature flags, capas extra)
  hasta que el requisito exista.
- Sin tests todavía — no hay convención establecida aún.

## Próximos pasos conocidos

1. Persistir tickets en PostgreSQL (reemplazar `InMemoryTicketRepository`).
2. Integrar clasificación/respuesta con IA en `CreateTicketUseCase`.
3. Autenticación y roles (usuario final vs. agente).
4. Vista para agentes humanos (bandeja de tickets pendientes).

No implementar estos puntos de forma preventiva — se abordarán en iteraciones
posteriores, uno a la vez.
