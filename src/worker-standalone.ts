import { connectDatabases } from "./config/database";
import IORedis from "ioredis";
import { runJourneyNode } from "./worker";
import { queue } from "./queue";
import { setupShutdownHandlers } from "./utils/shutdown";
import { Worker } from "bullmq";
import { QUEUE_NAME } from "./constants";

const startWorker = async () => {
  try {
    const connection = new IORedis({ maxRetriesPerRequest: null });

    const worker = new Worker(QUEUE_NAME, runJourneyNode, { connection });

    worker.on("completed", (job) => {
      console.log(`${job.id} has completed!`);
    });

    worker.on("failed", (job, err) => {
      if (!job) return;
      console.error(`${job.id} has failed with ${err.message}`);
    });

    await connectDatabases();
    console.log("Worker started and listening for jobs...");

    // Setup graceful shutdown handlers for standalone worker
    // Note: We pass null for server since this is worker-only
    setupShutdownHandlers(null, queue, worker);
  } catch (error) {
    console.error("Failed to start worker:", error);
    process.exit(1);
  }
};

startWorker();
