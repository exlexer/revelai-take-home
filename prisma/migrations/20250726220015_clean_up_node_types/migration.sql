/*
  Warnings:

  - The values [ACTION] on the enum `NodeType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NodeType_new" AS ENUM ('LOG', 'DELAY', 'CONDITIONAL');
ALTER TABLE "JourneyNode" ALTER COLUMN "type" TYPE "NodeType_new" USING ("type"::text::"NodeType_new");
ALTER TYPE "NodeType" RENAME TO "NodeType_old";
ALTER TYPE "NodeType_new" RENAME TO "NodeType";
DROP TYPE "NodeType_old";
COMMIT;
