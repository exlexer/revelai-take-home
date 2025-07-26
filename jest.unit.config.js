module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Unit Tests',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/unit/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  coverageDirectory: 'coverage/unit',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/server.ts',
    '!src/worker-standalone.ts',
  ],
  testTimeout: 5000,
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test',
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Mock external dependencies for unit tests
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
};