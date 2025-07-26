module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Integration Tests',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/integration/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  coverageDirectory: 'coverage/integration',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  testTimeout: 30000,
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test',
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};