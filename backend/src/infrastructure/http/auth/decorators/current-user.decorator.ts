import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../../../domain/auth/user-role.enum';

export interface CurrentUserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Lee el usuario autenticado que JwtStrategy dejó en request.user (ver
 * JwtAuthGuard, que dispara esa estrategia antes de que esto se ejecute).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
