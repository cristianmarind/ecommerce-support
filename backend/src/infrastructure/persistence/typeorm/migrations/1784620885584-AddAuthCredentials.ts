import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthCredentials1784620885584 implements MigrationInterface {
  name = 'AddAuthCredentials1784620885584';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Credenciales para auth real (JWT): hash de password (bcrypt) y hash del
    // refresh token vigente (login/refresh lo setean, logout lo limpia a null).
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "password_hash" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "refresh_token_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT`,
    );

    // Se pasa de 3 roles (Cliente/Agente/Admin) a 2 (user/admin), acorde a la
    // nueva auth real con 2 roles. Primero re-apuntamos los usuarios
    // existentes a los roles nuevos, después limpiamos los viejos.
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "description") VALUES
        ('9f000000-0000-4000-8000-000000000004', 'user', 'Usuario final que crea tickets de soporte'),
        ('9f000000-0000-4000-8000-000000000005', 'admin', 'Administrador/agente del sistema de soporte')
    `);

    await queryRunner.query(`
      UPDATE "users" SET role_id = '9f000000-0000-4000-8000-000000000004'
      WHERE role_id = '9f000000-0000-4000-8000-000000000001'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role_id = '9f000000-0000-4000-8000-000000000005'
      WHERE role_id IN ('9f000000-0000-4000-8000-000000000002', '9f000000-0000-4000-8000-000000000003')
    `);

    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE role_id IN (
        '9f000000-0000-4000-8000-000000000001',
        '9f000000-0000-4000-8000-000000000002',
        '9f000000-0000-4000-8000-000000000003'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE id IN (
        '9f000000-0000-4000-8000-000000000001',
        '9f000000-0000-4000-8000-000000000002',
        '9f000000-0000-4000-8000-000000000003'
      )
    `);

    // Contraseña de ambos usuarios demo: "password" (bcrypt, 10 rounds).
    await queryRunner.query(`
      UPDATE "users" SET password_hash = '$2a$10$WuQ186a5zKWloFRNxoYYUe75esJ2sV/.M9mQTiMxscHp7kSr7lH5i'
      WHERE email IN ('cliente.demo@imagineapps.test', 'admin.demo@imagineapps.test')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No es perfectamente simétrico: Agente y Admin colapsaron en un solo rol
    // "admin", así que al revertir no se puede saber cuál era cuál. Se
    // restauran Cliente/Admin (no Agente) — suficiente para deshacer el
    // esquema, no para recuperar la distinción original de datos.
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "description") VALUES
        ('9f000000-0000-4000-8000-000000000001', 'Cliente', 'Usuario final que crea tickets de soporte'),
        ('9f000000-0000-4000-8000-000000000003', 'Admin', 'Administrador del sistema de soporte')
    `);
    await queryRunner.query(`
      UPDATE "users" SET role_id = '9f000000-0000-4000-8000-000000000001'
      WHERE role_id = '9f000000-0000-4000-8000-000000000004'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role_id = '9f000000-0000-4000-8000-000000000003'
      WHERE role_id = '9f000000-0000-4000-8000-000000000005'
    `);
    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE id IN ('9f000000-0000-4000-8000-000000000004', '9f000000-0000-4000-8000-000000000005')
    `);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token_hash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
  }
}
