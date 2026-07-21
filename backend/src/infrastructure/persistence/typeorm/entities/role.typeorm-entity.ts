import { Column, Entity } from 'typeorm';
import { AuditableBaseEntity } from './auditable.base-entity';

@Entity('roles')
export class RoleTypeOrmEntity extends AuditableBaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
