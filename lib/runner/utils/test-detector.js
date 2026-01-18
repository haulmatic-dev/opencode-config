import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FRAMEWORK_PATTERNS = {
  jest: {
    filePatterns: [
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.jsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
    ],
    configKeys: ['jest'],
  },
  vitest: {
    filePatterns: [
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.jsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
    ],
    configKeys: ['vitest'],
  },
  mocha: {
    filePatterns: [
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.jsx',
      '**/test/**/*.js',
      '**/test/**/*.ts',
      '**/tests/**/*.js',
      '**/tests/**/*.ts',
    ],
    configKeys: ['mocha'],
  },
};

export class TestFileDetector {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.packageJsonPath = join(projectRoot, 'package.json');
    this.framework = null;
    this.patterns = [];
    this.frameworkConfig = null;
  }

  async detectFramework() {
    try {
      const packageJsonContent = await readFile(this.packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const frameworkKeys = Object.keys(dependencies);

      if (frameworkKeys.includes('vitest')) {
        this.framework = 'vitest';
      } else if (frameworkKeys.includes('jest')) {
        this.framework = 'jest';
      } else if (frameworkKeys.includes('mocha')) {
        this.framework = 'mocha';
      } else {
        this.framework = 'unknown';
      }

      this.patterns =
        FRAMEWORK_PATTERNS[this.framework]?.filePatterns ||
        FRAMEWORK_PATTERNS.jest.filePatterns;
      this.frameworkConfig = this.readFrameworkConfig(packageJson);

      return this.framework;
    } catch (error) {
      this.framework = 'unknown';
      this.patterns = FRAMEWORK_PATTERNS.jest.filePatterns;
      this.frameworkConfig = {};
      return 'unknown';
    }
  }

  readFrameworkConfig(packageJson) {
    const frameworkConfig = {};
    const frameworkInfo = FRAMEWORK_PATTERNS[this.framework];

    if (frameworkInfo) {
      for (const key of frameworkInfo.configKeys) {
        if (packageJson[key]) {
          frameworkConfig[key] = packageJson[key];
        }
      }
    }

    if (packageJson.jest) {
      frameworkConfig.jest = packageJson.jest;
    }
    if (packageJson.vitest) {
      frameworkConfig.vitest = packageJson.vitest;
    }
    if (packageJson.mocha) {
      frameworkConfig.mocha = packageJson.mocha;
    }

    return frameworkConfig;
  }

  isTestFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of this.patterns) {
      const regexPattern = this.globToRegex(pattern);
      if (regexPattern.test(normalizedPath)) {
        return true;
      }
    }

    return false;
  }

  globToRegex(globPattern) {
    const regexStr = globPattern
      .replace(/\*\*/g, '{{DOUBLE_ASTERISK}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{DOUBLE_ASTERISK\}\}/g, '.*')
      .replace(/\./g, '\\.')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexStr}$`);
  }

  async detectTestFiles(filePaths) {
    if (!this.framework) {
      await this.detectFramework();
    }

    return filePaths.filter((filePath) => this.isTestFile(filePath));
  }

  async detectCodeFiles(filePaths) {
    if (!this.framework) {
      await this.detectFramework();
    }

    return filePaths.filter((filePath) => !this.isTestFile(filePath));
  }

  getFrameworkPatterns() {
    return {
      framework: this.framework,
      patterns: this.patterns,
      config: this.frameworkConfig,
    };
  }
}

export async function createTestDetector(projectRoot = process.cwd()) {
  const detector = new TestFileDetector(projectRoot);
  await detector.detectFramework();
  return detector;
}
