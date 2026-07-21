import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';

/**
 * DataSource usado exclusivamente por el CLI de TypeORM (migration:generate/
 * run/revert). Lee las mismas variables de entorno que el AppModule, pero
 * apunta a los archivos .ts en src/ porque el CLI corre vía ts-node.
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: process.env.POSTGRES_DB ?? 'imagineapps',
  entities: [join(__dirname, '../persistence/typeorm/entities/*.ts')],
  migrations: [join(__dirname, '../persistence/typeorm/migrations/*.ts')],
});

export default AppDataSource;
