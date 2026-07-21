import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * La conexión a PostgreSQL queda lista desde ya, aunque los tickets
 * todavía viven en un repositorio en memoria (ver InMemoryTicketRepository).
 * `entities` se irá llenando a medida que se migren agregados a TypeORM.
 */
export const buildTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USER', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_NAME', 'imagineapps'),
  entities: [],
  autoLoadEntities: true,
  synchronize: configService.get<string>('NODE_ENV', 'development') !== 'production',
});
