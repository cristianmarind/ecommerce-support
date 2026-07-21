import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../../domain/auth/user-role.enum';
import { CurrentUserData } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Autorización por rol: lee los roles requeridos con @Roles(...) y los
 * compara contra request.user.role (poblado por JwtAuthGuard/JwtStrategy, que
 * debe ejecutarse antes que este guard). Si el endpoint no tiene @Roles, deja
 * pasar a cualquier usuario autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[] | undefined>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: CurrentUserData | undefined = request.user;
    return !!user && requiredRoles.includes(user.role);
  }
}
