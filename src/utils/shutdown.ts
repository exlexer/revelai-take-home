import { Queue, Worker } from "bullmq";
import { prisma } from "../config/database";

export async function gracefulShutdown(
  signal: string,
  server: any,
  queue?: Queue,
  worker?: Worker
) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new requests (if server exists)
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
    });
  }

  try {
    // Close queue if provided
    if (queue) {
      console.log("Closing queue connection...");
      await queue.close();
      console.log("Queue connection closed");
    }

    // Close worker if provided
    if (worker) {
      console.log("Closing worker...");
      // This will wait for current jobs to finish processing
      await worker.close();
      console.log("Worker closed");
    }

    // Disconnect from database
    console.log("Disconnecting from database...");
    await prisma.$disconnect();
    console.log("Database disconnected");

    console.log("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

export function setupShutdownHandlers(
  server: any,
  queue?: Queue,
  worker?: Worker
) {
  // Handle different termination signals
  ["SIGTERM", "SIGINT", "SIGUSR2"].forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal, server, queue, worker));
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    gracefulShutdown("uncaughtException", server, queue, worker);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("unhandledRejection", server, queue, worker);
  });
}