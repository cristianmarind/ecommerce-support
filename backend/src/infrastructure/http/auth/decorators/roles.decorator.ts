import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../../domain/auth/user-role.enum';

export const ROLES_KEY = 'roles';

/** Marca qué roles pueden acceder al endpoint; lo lee RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
