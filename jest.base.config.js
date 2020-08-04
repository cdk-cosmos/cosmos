module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleDirectories: [`${__dirname}/node_modules`],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  setupFiles: [`${__dirname}/src/test/jest.setup.ts`],
  globals: {
    'ts-jest': {
      tsConfig: `${__dirname}/tsconfig.base.json`,
    },
  },
  // moduleNameMapper: {
  //   fs: `${__dirname}/src/test/mocks/fs.ts`,
  // },
  // TODO:
  // coverageThreshold: {
  //   global: {
  //     branches: 100,
  //     functions: 100,
  //     lines: 100,
  //     statements: 100,
  //   },
  // },
};
