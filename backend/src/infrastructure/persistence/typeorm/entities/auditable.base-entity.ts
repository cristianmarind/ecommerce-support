import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Columnas comunes a todas las tablas del esquema: id, timestamps y quién creó/
 * actualizó el registro (id de un User; null si aún no hay autenticación real
 * o el actor es la IA). creatorId/updaterId no llevan @ManyToOne para evitar
 * imports circulares entre entidades y esta base — la integridad referencial
 * hacia `users` se declara en la migración.
 */
export abstract class AuditableBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'creator_id', type: 'uuid', nullable: true })
  creatorId: string | null;

  @Column({ name: 'updater_id', type: 'uuid', nullable: true })
  updaterId: string | null;
}
