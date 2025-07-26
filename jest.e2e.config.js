module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'E2E Tests',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/e2e/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  coverageDirectory: 'coverage/e2e',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
  testTimeout: 60000, // Longer timeout for e2e tests
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test',
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Run tests serially to avoid conflicts with shared services
  maxWorkers: 1,
};