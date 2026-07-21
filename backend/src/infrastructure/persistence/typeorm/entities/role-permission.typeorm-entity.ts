import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from './auditable.base-entity';
import { PermissionTypeOrmEntity } from './permission.typeorm-entity';
import { RoleTypeOrmEntity } from './role.typeorm-entity';

@Entity('role_permissions')
export class RolePermissionTypeOrmEntity extends AuditableBaseEntity {
  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId: string;

  @ManyToOne(() => RoleTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: RoleTypeOrmEntity;

  @ManyToOne(() => PermissionTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: PermissionTypeOrmEntity;
}
