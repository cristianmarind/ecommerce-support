import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1784606391608 implements MigrationInterface {
    name = 'InitSchema1784606391608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "creator_id" uuid, "updater_id" uuid, "code" character varying NOT NULL, "description" text, CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "creator_id" uuid, "updater_id" uuid, "name" character varying NOT NULL, "description" text, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "creator_id" uuid, "updater_id" uuid, "role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "creator_id" uuid, "updater_id" uuid, "email" character varying NOT NULL, "name" character varying NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."messages_sender_type_enum" AS ENUM('CLIENTE', 'IA', 'AGENTE')`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "creator_id" uuid, "updater_id" uuid, "ticket_id" uuid NOT NULL, "sender_type" "public"."messages_sender_type_enum" NOT NULL, "content" text NOT NULL, "suggested_response" text, "confidence_score" numeric(5,4), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('RESOLVIENDO_IA', 'RESUELTO_IA', 'PENDIENTE_AGENTE', 'RESOLVIENDO_AGENTE', 'RESUELTO_AGENTE')`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_category_enum" AS ENUM('FACTURACION', 'ENVIOS', 'DEVOLUCIONES', 'TECNICO', 'GENERAL')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "creator_id" uuid, "updater_id" uuid, "description" text NOT NULL, "status" "public"."tickets_status_enum" NOT NULL, "category" "public"."tickets_category_enum" NOT NULL, CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_aa8e62e23565f59d22160b35f18" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Integridad referencial de los campos de auditoría comunes (creator_id/updater_id -> users.id).
        // No se modelan como relaciones de TypeORM para evitar imports circulares entre AuditableBaseEntity
        // y UserTypeOrmEntity; se declaran acá directamente.
        await queryRunner.query(`ALTER TABLE "permissions" ADD CONSTRAINT "FK_permissions_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "permissions" ADD CONSTRAINT "FK_permissions_updater" FOREIGN KEY ("updater_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_updater" FOREIGN KEY ("updater_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_updater" FOREIGN KEY ("updater_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_updater" FOREIGN KEY ("updater_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_updater" FOREIGN KEY ("updater_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_updater" FOREIGN KEY ("updater_id") REFERENCES "users"("id") ON DELETE SET NULL`);

        // Seed: roles, permisos y 2 usuarios demo. Los ids de usuario coinciden con
        // SEEDED_CUSTOMER_ID/SEEDED_ADMIN_ID en infrastructure/http/auth/constants,
        // usados por los guards/decoradores "quemados" mientras no hay auth real.
        await queryRunner.query(`
            INSERT INTO "roles" ("id", "name", "description") VALUES
                ('9f000000-0000-4000-8000-000000000001', 'Cliente', 'Usuario final que crea tickets de soporte'),
                ('9f000000-0000-4000-8000-000000000002', 'Agente', 'Agente humano que atiende tickets escalados'),
                ('9f000000-0000-4000-8000-000000000003', 'Admin', 'Administrador del sistema de soporte')
        `);

        await queryRunner.query(`
            INSERT INTO "permissions" ("id", "code", "description") VALUES
                ('9f000000-0000-4000-8000-000000000011', 'tickets:create', 'Crear tickets de soporte'),
                ('9f000000-0000-4000-8000-000000000012', 'tickets:read', 'Ver el listado de tickets'),
                ('9f000000-0000-4000-8000-000000000013', 'tickets:manage', 'Gestionar/resolver tickets escalados'),
                ('9f000000-0000-4000-8000-000000000014', 'messages:create', 'Enviar mensajes en un ticket')
        `);

        await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "role_id", "permission_id") VALUES
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000001', '9f000000-0000-4000-8000-000000000011'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000001', '9f000000-0000-4000-8000-000000000014'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000002', '9f000000-0000-4000-8000-000000000012'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000002', '9f000000-0000-4000-8000-000000000013'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000002', '9f000000-0000-4000-8000-000000000014'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000003', '9f000000-0000-4000-8000-000000000011'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000003', '9f000000-0000-4000-8000-000000000012'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000003', '9f000000-0000-4000-8000-000000000013'),
                (uuid_generate_v4(), '9f000000-0000-4000-8000-000000000003', '9f000000-0000-4000-8000-000000000014')
        `);

        await queryRunner.query(`
            INSERT INTO "users" ("id", "email", "name", "role_id") VALUES
                ('11111111-1111-1111-1111-111111111111', 'cliente.demo@imagineapps.test', 'Cliente Demo', '9f000000-0000-4000-8000-000000000001'),
                ('22222222-2222-2222-2222-222222222222', 'admin.demo@imagineapps.test', 'Admin Demo', '9f000000-0000-4000-8000-000000000003')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_aa8e62e23565f59d22160b35f18"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TYPE "public"."messages_sender_type_enum"`);
        await queryRunner.query(`DROP TABLE "users" CASCADE`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
