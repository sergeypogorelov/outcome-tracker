import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716140000000 implements MigrationInterface {
  name = 'InitialSchema1716140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."necessity_level_enum" AS ENUM('MUST', 'SEMI', 'LUXURY')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "telegramId" bigint NOT NULL,
        "username" character varying(255),
        "firstName" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_telegramId" UNIQUE ("telegramId"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "defaultNecessityLevel" "public"."necessity_level_enum" NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "merchant_rules" (
        "id" SERIAL NOT NULL,
        "pattern" character varying(255) NOT NULL,
        "categoryId" integer NOT NULL,
        "necessityLevel" "public"."necessity_level_enum" NOT NULL,
        "priority" integer NOT NULL DEFAULT 100,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_merchant_rules_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "currency" character varying(10) NOT NULL,
        "merchant" character varying(255),
        "description" character varying(500),
        "rawMessage" text,
        "transactionDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "categoryId" integer,
        "necessityLevel" "public"."necessity_level_enum" NOT NULL,
        "confidence" numeric(3,2),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "merchant_rules"
      ADD CONSTRAINT "FK_merchant_rules_category"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_category"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_user_date" ON "transactions" ("userId", "transactionDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_merchant_rules_priority" ON "merchant_rules" ("priority")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_merchant_rules_priority"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_user_date"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant_rules" DROP CONSTRAINT "FK_merchant_rules_category"`,
    );
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "merchant_rules"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."necessity_level_enum"`);
  }
}
