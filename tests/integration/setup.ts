import { prisma } from '../../src/config/database';

beforeAll(async () => {
  // Integration tests use real database but with test data
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Clean database between tests
afterEach(async () => {
  // Clean up in reverse dependency order
  await prisma.$transaction([
    prisma.executionLog.deleteMany(),
    prisma.run.deleteMany(),
    prisma.journeyNodes.deleteMany(),
    prisma.journey.deleteMany(),
    prisma.journeyNode.deleteMany(),
  ]);
});