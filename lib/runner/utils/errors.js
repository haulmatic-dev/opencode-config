/**
 * Quality Gate Error Types and Handling
 *
 * Provides structured error types with codes, exit codes, and categories.
 */

export const ErrorTypes = {
  MISSING_TOOL: {
    code: 'MISSING_TOOL',
    exitCode: 10,
    category: 'expected',
    message: 'Required tool is not installed or not in PATH',
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    exitCode: 11,
    category: 'critical',
    message: 'Validation failed - input does not meet requirements',
  },
  CONFIGURATION_ERROR: {
    code: 'CONFIGURATION_ERROR',
    exitCode: 12,
    category: 'critical',
    message: 'Configuration is invalid or missing required values',
  },
  RUNTIME_ERROR: {
    code: 'RUNTIME_ERROR',
    exitCode: 13,
    category: 'error',
    message: 'Runtime error occurred during execution',
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    exitCode: 14,
    category: 'error',
    message: 'Operation timed out',
  },
  GATE_FAILED: {
    code: 'GATE_FAILED',
    exitCode: 20,
    category: 'error',
    message: 'Quality gate check failed',
  },
};

export class QualityGateError extends Error {
  constructor(errorType, context = {}) {
    const type =
      typeof errorType === 'string'
        ? ErrorTypes[errorType] || ErrorTypes.RUNTIME_ERROR
        : errorType;

    super(type.message);
    this.name = 'QualityGateError';
    this.code = type.code;
    this.exitCode = type.exitCode;
    this.category = type.category;
    this.context = context;
    this.remediationHint = this._buildRemediationHint();
    this.timestamp = new Date().toISOString();
  }

  _buildRemediationHint() {
    const hints = {
      [ErrorTypes.MISSING_TOOL.code]:
        'Install the required tool or check your PATH configuration',
      [ErrorTypes.VALIDATION_ERROR.code]:
        'Review the validation requirements and fix the input',
      [ErrorTypes.CONFIGURATION_ERROR.code]:
        'Check your configuration file and ensure all required values are set',
      [ErrorTypes.RUNTIME_ERROR.code]:
        'Review the error stack trace and fix the underlying issue',
      [ErrorTypes.TIMEOUT.code]:
        'Consider increasing the timeout or optimizing the operation',
      [ErrorTypes.GATE_FAILED.code]:
        'Fix the quality gate issues before proceeding',
    };
    return hints[this.code] || 'No specific remediation available';
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      exitCode: this.exitCode,
      category: this.category,
      message: this.message,
      context: this.context,
      remediation: this.remediationHint,
      timestamp: this.timestamp,
    };
  }
}

export function classifyError(error) {
  const message = error.message || String(error).toLowerCase();

  if (
    message.includes('not found') ||
    message.includes('not installed') ||
    message.includes('command not found')
  ) {
    return ErrorTypes.MISSING_TOOL;
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorTypes.TIMEOUT;
  }

  if (message.includes('config') || message.includes('validation')) {
    return message.includes('config')
      ? ErrorTypes.CONFIGURATION_ERROR
      : ErrorTypes.VALIDATION_ERROR;
  }

  return ErrorTypes.RUNTIME_ERROR;
}

export function createError(type, context = {}) {
  return new QualityGateError(type, context);
}

export default {
  ErrorTypes,
  QualityGateError,
  classifyError,
  createError,
};
