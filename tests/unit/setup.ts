// Unit test setup - mock all external dependencies
jest.mock('../../src/config/database', () => ({
  prisma: {
    // Add prisma mocks as needed
    journey: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    run: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    journeyNode: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    executionLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/queue', () => ({
  queue: {
    add: jest.fn(),
    getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
    drain: jest.fn(),
    obliterate: jest.fn(),
  },
}));

// Suppress console.log in unit tests unless explicitly testing it
const originalConsole = console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
  jest.clearAllMocks();
});