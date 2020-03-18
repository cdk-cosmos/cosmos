// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseConfig = require('../../../jest.base.config');

module.exports = {
  ...baseConfig,
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/../../../tsconfig.base.json',
    },
  },
};
