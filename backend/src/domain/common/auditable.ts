/**
 * Campos mínimos que debe tener toda entidad del dominio para trazabilidad:
 * cuándo se creó/actualizó y quién lo hizo (id de un User, o null si aún no
 * hay autenticación real / el actor es la IA).
 */
export interface AuditableFields {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly creatorId: string | null;
  readonly updaterId: string | null;
}
