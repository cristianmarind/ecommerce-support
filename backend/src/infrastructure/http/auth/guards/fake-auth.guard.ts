import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Guard "quemado": deja pasar cualquier petición sin validar nada.
 *
 * TODO: aquí iría la lógica real de autenticación (validar el JWT/sesión del
 * request) y de autorización (verificar que el usuario autenticado tenga el
 * permiso requerido para el recurso/acción, ej. contra Role/Permission) antes
 * de decidir si la petición continúa.
 */
@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
