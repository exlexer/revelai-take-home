-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('ACTION', 'DELAY', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "JourneyNode" (
    "id" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "definition" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startNodeId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyNodes" (
    "journeyId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "JourneyNodes_pkey" PRIMARY KEY ("journeyId","nodeId")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "parientContext" JSONB NOT NULL,
    "status" "RunStatus" NOT NULL,
    "current_node_id" TEXT,
    "patient_context" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JourneyNodes_journeyId_nodeId_idx" ON "JourneyNodes"("journeyId", "nodeId");

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_startNodeId_fkey" FOREIGN KEY ("startNodeId") REFERENCES "JourneyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyNodes" ADD CONSTRAINT "JourneyNodes_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyNodes" ADD CONSTRAINT "JourneyNodes_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "JourneyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "JourneyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
