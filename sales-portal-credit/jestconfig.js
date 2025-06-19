module.exports = {
    // displayName: 'test',
    testPathIgnorePatterns: ['/node_modules/', '/__tests__/fixtures/'],
    preset: 'ts-jest',
    setupFiles: ['./app/config/environments/test.ts'],
    coverageDirectory: './coverage',
    collectCoverage: true,
    collectCoverageFrom: [
      '**/app/service/**',
      '**/app/controller/**',
      '**/app/routes/**',
      '**/app/middleware/**',
      '**/app/helper/**',
    ],
    // testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec).[jt]s?(x)'],
    resetMocks: true,
    clearMocks: true,
  };