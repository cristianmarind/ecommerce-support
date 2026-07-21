import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from './auditable.base-entity';
import { RoleTypeOrmEntity } from './role.typeorm-entity';

@Entity('users')
export class UserTypeOrmEntity extends AuditableBaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => RoleTypeOrmEntity)
  @JoinColumn({ name: 'role_id' })
  role: RoleTypeOrmEntity;
}
