import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  SEEDED_ADMIN_ID,
  SEEDED_CUSTOMER_ID,
} from '../constants/seeded-users';

type FakeUserKind = 'customer' | 'admin';

/**
 * Decorador "quemado": retorna el id de un usuario sembrado según el rol que
 * se espera para ese endpoint, en vez de leer al usuario autenticado real.
 *
 * TODO: aquí iría la lógica real de "get current user": leer `request.user`
 * (poblado por un guard de autenticación real, ej. una estrategia JWT que
 * valide el token y cargue el User) y retornar su id.
 */
export const CurrentUserId = createParamDecorator(
  (kind: FakeUserKind = 'customer', _ctx: ExecutionContext): string => {
    return kind === 'admin' ? SEEDED_ADMIN_ID : SEEDED_CUSTOMER_ID;
  },
);
