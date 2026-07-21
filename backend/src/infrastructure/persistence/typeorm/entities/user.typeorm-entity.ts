import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from './auditable.base-entity';
import { RoleTypeOrmEntity } from './role.typeorm-entity';

@Entity('users')
export class UserTypeOrmEntity extends AuditableBaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  /** Hash del refresh token vigente; null si no tiene sesión activa (logout). */
  @Column({ name: 'refresh_token_hash', type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => RoleTypeOrmEntity)
  @JoinColumn({ name: 'role_id' })
  role: RoleTypeOrmEntity;
}
