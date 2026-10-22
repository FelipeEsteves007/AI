/** @type {import('jest').Config} */

const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@server/(.*)$': '<rootDir>/server/$1',
};

const swcTransform = (tsx) => [
  '@swc/jest',
  {
    jsc: {
      parser: { syntax: 'typescript', tsx },
      transform: tsx ? { react: { runtime: 'automatic' } } : undefined,
    },
  },
];

module.exports = {
  // Fakes e helpers de teste são ferramenta de teste, não código medido.
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/'],
  projects: [
    {
      // O nome `api` fica: os hooks dos agents chamam `jest --selectProjects api`.
      displayName: 'api',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/server'],
      transform: { '^.+\\.ts$': swcTransform(false) },
      moduleNameMapper,
    },
    {
      displayName: 'web',
      testEnvironment: '<rootDir>/tests/setup/jsdomEnvironment.js',
      roots: ['<rootDir>/tests/src'],
      transform: { '^.+\\.(ts|tsx)$': swcTransform(true) },
      moduleNameMapper: { ...moduleNameMapper, '\\.css$': '<rootDir>/tests/setup/styleMock.js' },
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/pages/**', '!src/types/**'],
    },
  ],
  coverageThreshold: {
    global: { statements: 70, branches: 70, functions: 70, lines: 70 },
  },
};
