module.exports = {
    // displayName: 'test',
    testPathIgnorePatterns: ['/node_modules/', '/__tests__/fixtures/'],
    preset: 'ts-jest',
    // setupFiles: ['./test/config'],
    coverageDirectory: './coverage',
    // testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec).[jt]s?(x)'],
    resetMocks: true,
    clearMocks: true,
  };