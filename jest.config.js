module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    setupFiles: ['<rootDir>/tests/setupEnv.ts'],
    globalSetup: '<rootDir>/tests/globalSetup.ts',
    verbose: true,
    forceExit: true,
};