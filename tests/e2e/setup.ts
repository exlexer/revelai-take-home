import { prisma } from '../../src/config/database';
import { queue } from '../../src/queue';

beforeAll(async () => {
  // E2E tests require full services to be running
  // Ensure Redis is connected
  await queue.waitUntilReady();
});

afterAll(async () => {
  await queue.close();
  await prisma.$disconnect();
});

// Clean everything between tests
afterEach(async () => {
  // Clean queue jobs
  await queue.obliterate();
  
  // Clean database in reverse dependency order
  await prisma.$transaction([
    prisma.executionLog.deleteMany(),
    prisma.run.deleteMany(),
    prisma.journeyNodes.deleteMany(),
    prisma.journey.deleteMany(),
    prisma.journeyNode.deleteMany(),
  ]);
});