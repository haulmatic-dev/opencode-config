import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  classifyError,
  createConfigurationError,
  createMissingToolError,
  createRuntimeError,
  createTimeoutError,
  createValidationError,
  ErrorCategories,
  ErrorTypes,
  ExitCodes,
  formatErrorForOutput,
  getExitCodeForGateResult,
  QualityGateError,
} from './lib/runner/utils/errors.js';

describe('ErrorTypes', () => {
  it('should define all required error types', () => {
    expect(ErrorTypes.MISSING_TOOL).toBe('MISSING_TOOL');
    expect(ErrorTypes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorTypes.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
    expect(ErrorTypes.RUNTIME_ERROR).toBe('RUNTIME_ERROR');
    expect(ErrorTypes.TIMEOUT).toBe('TIMEOUT');
  });
});

describe('ExitCodes', () => {
  it('should define distinct exit codes for each error type', () => {
    expect(ExitCodes.SUCCESS).toBe(0);
    expect(ExitCodes.MISSING_TOOL).toBe(10);
    expect(ExitCodes.VALIDATION_ERROR).toBe(11);
    expect(ExitCodes.CONFIGURATION_ERROR).toBe(12);
    expect(ExitCodes.RUNTIME_ERROR).toBe(13);
    expect(ExitCodes.TIMEOUT).toBe(14);
    expect(ExitCodes.GATE_FAILED).toBe(20);
  });

  it('should have unique exit codes', () => {
    const codes = Object.values(ExitCodes);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

describe('ErrorCategories', () => {
  it('should map error types to categories', () => {
    expect(ErrorCategories[ErrorTypes.MISSING_TOOL]).toBe('tooling');
    expect(ErrorCategories[ErrorTypes.VALIDATION_ERROR]).toBe('validation');
    expect(ErrorCategories[ErrorTypes.CONFIGURATION_ERROR]).toBe(
      'configuration',
    );
    expect(ErrorCategories[ErrorTypes.RUNTIME_ERROR]).toBe('runtime');
    expect(ErrorCategories[ErrorTypes.TIMEOUT]).toBe('timeout');
  });
});

describe('QualityGateError', () => {
  it('should create an error with code, exitCode, category, and context', () => {
    const error = new QualityGateError(
      ErrorTypes.MISSING_TOOL,
      ExitCodes.MISSING_TOOL,
      ErrorCategories[ErrorTypes.MISSING_TOOL],
      { toolName: 'stryker' },
    );

    expect(error.code).toBe(ErrorTypes.MISSING_TOOL);
    expect(error.exitCode).toBe(ExitCodes.MISSING_TOOL);
    expect(error.category).toBe('tooling');
    expect(error.context.toolName).toBe('stryker');
  });

  it('should build a message with code and category', () => {
    const error = new QualityGateError(
      ErrorTypes.VALIDATION_ERROR,
      ExitCodes.VALIDATION_ERROR,
      ErrorCategories[ErrorTypes.VALIDATION_ERROR],
      { field: 'email' },
    );

    expect(error.message).toContain(ErrorTypes.VALIDATION_ERROR);
    expect(error.message).toContain('validation');
  });

  it('should include context in the message', () => {
    const error = new QualityGateError(
      ErrorTypes.RUNTIME_ERROR,
      ExitCodes.RUNTIME_ERROR,
      ErrorCategories[ErrorTypes.RUNTIME_ERROR],
      { operation: 'stryker run' },
    );

    expect(error.message).toContain('stryker run');
  });

  it('should generate remediation hints based on error type', () => {
    const missingToolError = createMissingToolError('eslint');
    expect(missingToolError.remediationHint).toContain(
      'Install the required tool',
    );

    const validationError = createValidationError('name', '');
    expect(validationError.remediationHint).toContain('Review the input data');

    const configError = createConfigurationError('timeout');
    expect(configError.remediationHint).toContain(
      'Check your configuration file',
    );

    const runtimeError = createRuntimeError('test', new Error('fail'));
    expect(runtimeError.remediationHint).toContain('Review the error details');

    const timeoutError = createTimeoutError('lint', 5000);
    expect(timeoutError.remediationHint).toContain('increasing the timeout');
  });

  it('should return a JSON representation', () => {
    const error = createMissingToolError('stryker');
    const json = error.toJSON();

    expect(json.name).toBe('QualityGateError');
    expect(json.code).toBe(ErrorTypes.MISSING_TOOL);
    expect(json.exitCode).toBe(ExitCodes.MISSING_TOOL);
    expect(json.category).toBe('tooling');
    expect(json.remediation).toBeDefined();
  });

  it('should handle empty context', () => {
    const error = new QualityGateError(
      ErrorTypes.RUNTIME_ERROR,
      ExitCodes.RUNTIME_ERROR,
      ErrorCategories[ErrorTypes.RUNTIME_ERROR],
    );

    expect(error.message).not.toContain('{}');
  });
});

describe('createMissingToolError', () => {
  it('should create a MISSING_TOOL error with toolName', () => {
    const error = createMissingToolError('stryker', {
      suggestion: 'npm install',
    });

    expect(error.code).toBe(ErrorTypes.MISSING_TOOL);
    expect(error.exitCode).toBe(ExitCodes.MISSING_TOOL);
    expect(error.context.toolName).toBe('stryker');
    expect(error.context.suggestion).toBe('npm install');
  });

  it('should work without additional context', () => {
    const error = createMissingToolError('eslint');

    expect(error.context.toolName).toBe('eslint');
    expect(Object.keys(error.context)).toHaveLength(1);
  });
});

describe('createValidationError', () => {
  it('should create a VALIDATION_ERROR with field and value', () => {
    const error = createValidationError('email', 'invalid');

    expect(error.code).toBe(ErrorTypes.VALIDATION_ERROR);
    expect(error.exitCode).toBe(ExitCodes.VALIDATION_ERROR);
    expect(error.context.field).toBe('email');
    expect(error.context.value).toBe('invalid');
  });
});

describe('createConfigurationError', () => {
  it('should create a CONFIGURATION_ERROR with setting', () => {
    const error = createConfigurationError('timeoutMs');

    expect(error.code).toBe(ErrorTypes.CONFIGURATION_ERROR);
    expect(error.exitCode).toBe(ExitCodes.CONFIGURATION_ERROR);
    expect(error.context.setting).toBe('timeoutMs');
  });
});

describe('createRuntimeError', () => {
  it('should create a RUNTIME_ERROR with operation and original error', () => {
    const originalError = new Error('Process exited with code 1');
    const error = createRuntimeError('mutation test', originalError);

    expect(error.code).toBe(ErrorTypes.RUNTIME_ERROR);
    expect(error.exitCode).toBe(ExitCodes.RUNTIME_ERROR);
    expect(error.context.operation).toBe('mutation test');
    expect(error.context.originalError).toBe('Process exited with code 1');
  });

  it('should handle string errors', () => {
    const error = createRuntimeError('lint', 'command not found');

    expect(error.context.originalError).toBe('command not found');
  });
});

describe('createTimeoutError', () => {
  it('should create a TIMEOUT error with operation and timeoutMs', () => {
    const error = createTimeoutError('ubs scan', 60000);

    expect(error.code).toBe(ErrorTypes.TIMEOUT);
    expect(error.exitCode).toBe(ExitCodes.TIMEOUT);
    expect(error.context.operation).toBe('ubs scan');
    expect(error.context.timeoutMs).toBe(60000);
  });
});

describe('classifyError', () => {
  it('should return handled=true for QualityGateError', () => {
    const error = createMissingToolError('stryker');
    const classification = classifyError(error);

    expect(classification.handled).toBe(true);
    expect(classification.type).toBe(ErrorTypes.MISSING_TOOL);
  });

  it('should classify timeout errors', () => {
    const error = new Error('Operation timed out after 30000ms');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.TIMEOUT);
    expect(classification.exitCode).toBe(ExitCodes.TIMEOUT);
  });

  it('should classify "timed out" errors', () => {
    const error = new Error('Stryker timed out');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.TIMEOUT);
  });

  it('should classify "not found" errors as MISSING_TOOL', () => {
    const error = new Error('stryker not found');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.MISSING_TOOL);
    expect(classification.exitCode).toBe(ExitCodes.MISSING_TOOL);
  });

  it('should classify "not installed" errors as MISSING_TOOL', () => {
    const error = new Error('Package not installed');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.MISSING_TOOL);
  });

  it('should classify "command not found" errors as MISSING_TOOL', () => {
    const error = new Error('npm: command not found');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.MISSING_TOOL);
  });

  it('should classify validation errors', () => {
    const error = new Error('Validation failed for email');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.VALIDATION_ERROR);
  });

  it('should classify "invalid" errors as VALIDATION_ERROR', () => {
    const error = new Error('Invalid configuration');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.VALIDATION_ERROR);
  });

  it('should classify "required" errors as VALIDATION_ERROR', () => {
    const error = new Error('Field is required');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.VALIDATION_ERROR);
  });

  it('should classify configuration errors', () => {
    const error = new Error('Configuration error: timeout not set');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.CONFIGURATION_ERROR);
  });

  it('should classify environment errors as CONFIGURATION_ERROR', () => {
    const error = new Error('Environment variable not set');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.CONFIGURATION_ERROR);
  });

  it('should default to RUNTIME_ERROR for unknown errors', () => {
    const error = new Error('Something unexpected happened');
    const classification = classifyError(error);

    expect(classification.type).toBe(ErrorTypes.RUNTIME_ERROR);
    expect(classification.exitCode).toBe(ExitCodes.RUNTIME_ERROR);
    expect(classification.handled).toBe(false);
  });
});

describe('getExitCodeForGateResult', () => {
  it('should return SUCCESS for passed results', () => {
    const result = { passed: true };
    expect(getExitCodeForGateResult(result)).toBe(ExitCodes.SUCCESS);
  });

  it('should return SUCCESS for skipped results', () => {
    const result = { passed: false, skipped: true };
    expect(getExitCodeForGateResult(result)).toBe(ExitCodes.SUCCESS);
  });

  it('should return GATE_FAILED for failed results without error', () => {
    const result = { passed: false, reason: 'Score too low' };
    expect(getExitCodeForGateResult(result)).toBe(ExitCodes.GATE_FAILED);
  });

  it('should classify error results', () => {
    const result = {
      passed: false,
      reason: 'Command not found: stryker',
      error: true,
    };
    const exitCode = getExitCodeForGateResult(result);
    expect(exitCode).toBe(ExitCodes.MISSING_TOOL);
  });
});

describe('formatErrorForOutput', () => {
  it('should format QualityGateError correctly', () => {
    const error = createMissingToolError('stryker');
    const formatted = formatErrorForOutput(error);

    expect(formatted.code).toBe(ErrorTypes.MISSING_TOOL);
    expect(formatted.message).toBeDefined();
    expect(formatted.remediation).toBeDefined();
    expect(formatted.exitCode).toBe(ExitCodes.MISSING_TOOL);
  });

  it('should format generic errors with default remediation', () => {
    const error = new Error('Unexpected error');
    const formatted = formatErrorForOutput(error);

    expect(formatted.code).toBe(ErrorTypes.RUNTIME_ERROR);
    expect(formatted.remediation).toBe(
      'Check the error message and system configuration',
    );
  });

  it('should include error message in output', () => {
    const error = createRuntimeError('test', new Error('Failed'));
    const formatted = formatErrorForOutput(error);

    expect(formatted.message).toContain('Failed');
  });
});
