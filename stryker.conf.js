export default {
  $schema: '@stryker-mutator/core/schema/stryker-schema.json',
  testRunner: 'vitest',
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  mutate: ['lib/runner/**/*.js', 'lib/runner/**/*.mjs'],
  tempDirName: '.stryker-tmp',
  ignorePatterns: ['.beads', 'node_modules'],
  fileLogLevel: 'info',
  logLevel: 'info',
  thresholds: {
    high: 80,
    low: 80,
    break: 80,
  },
  vitest: {
    configFile: undefined,
  },
};
