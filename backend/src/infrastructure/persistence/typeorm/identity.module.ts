import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionTypeOrmEntity } from './entities/permission.typeorm-entity';
import { RolePermissionTypeOrmEntity } from './entities/role-permission.typeorm-entity';
import { RoleTypeOrmEntity } from './entities/role.typeorm-entity';
import { UserTypeOrmEntity } from './entities/user.typeorm-entity';

/**
 * Registra las entidades de identidad (User/Role/Permission/RolePermission) para
 * que TypeORM las reconozca en el esquema y en las migraciones. Todavía no expone
 * repositorios ni casos de uso propios: la gestión de usuarios/roles y la
 * autenticación real se construirán en una iteración posterior.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTypeOrmEntity,
      RoleTypeOrmEntity,
      PermissionTypeOrmEntity,
      RolePermissionTypeOrmEntity,
    ]),
  ],
})
export class IdentityModule {}
