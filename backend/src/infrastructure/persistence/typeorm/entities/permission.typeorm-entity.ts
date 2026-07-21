import { Column, Entity } from 'typeorm';
import { AuditableBaseEntity } from './auditable.base-entity';

@Entity('permissions')
export class PermissionTypeOrmEntity extends AuditableBaseEntity {
  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
