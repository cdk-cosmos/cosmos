// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseConfig = require('./jest.base.config');

module.exports = {
  ...baseConfig,
  projects: ['<rootDir>/packages/*/*/jest.config.js'],
  roots: ['<rootDir>'],
};
