/*
  Warnings:

  - You are about to drop the column `executed_at` on the `ExecutionLog` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Journey` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Journey` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `JourneyNode` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `JourneyNode` table. All the data in the column will be lost.
  - You are about to drop the `runs` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Journey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `JourneyNode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ExecutionLog" DROP CONSTRAINT "ExecutionLog_runId_fkey";

-- DropForeignKey
ALTER TABLE "runs" DROP CONSTRAINT "runs_journeyId_fkey";

-- AlterTable
ALTER TABLE "ExecutionLog" DROP COLUMN "executed_at",
ADD COLUMN     "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Journey" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "JourneyNode" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "runs";

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "parientContext" JSONB NOT NULL,
    "status" "RunStatus" NOT NULL,
    "currentNodeId" TEXT,
    "patientContext" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
