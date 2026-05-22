import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionDuplicateFingerprint1716141000000
  implements MigrationInterface
{
  name = 'AddTransactionDuplicateFingerprint1716141000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "duplicateFingerprint" character varying(128)`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_transactions_duplicate_fingerprint"
      ON "transactions" ("duplicateFingerprint")
      WHERE "duplicateFingerprint" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transactions_duplicate_fingerprint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "duplicateFingerprint"`,
    );
  }
}
