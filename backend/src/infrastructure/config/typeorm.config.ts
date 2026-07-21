import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Configuración de conexión usada por el AppModule en tiempo de ejecución.
 * El esquema se gestiona con migraciones (ver migrations/), no con
 * `synchronize`. `migrationsRun: true` las aplica automáticamente al
 * arrancar; TypeORM lleva el registro de cuáles ya corrieron, así que es
 * seguro reiniciar el contenedor repetidamente en desarrollo.
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
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: true,
  migrations: [join(__dirname, '../persistence/typeorm/migrations/*{.ts,.js}')],
});
