import { prisma } from "../src/config/database";
import { queue } from "../src/queue";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up any remaining jobs in the queue
  await queue.drain();
  await queue.clean(0, 0);
  await queue.close();
  await prisma.$disconnect();
});

afterEach(async () => {
  // Delete in order of dependencies to avoid foreign key constraints
  await prisma.$transaction([
    // First delete execution logs (depends on runs and nodes)
    prisma.executionLog.deleteMany(),
    // Then delete runs (depends on journeys)
    prisma.run.deleteMany(),
    // Delete the junction table entries (depends on journeys and nodes)
    prisma.journeyNodes.deleteMany(),
    // Delete journeys (depends on nodes via startNodeId)
    prisma.journey.deleteMany(),
    // Finally delete nodes (no dependencies)
    prisma.journeyNode.deleteMany(),
  ]);
});
