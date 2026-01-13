import { dirname, fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class IrreversibleActionError extends Error {
  constructor(message, operation) {
    super(message);
    this.name = 'IrreversibleActionError';
    this.operation = operation;
  }
}

export function checkForIrreversibleAction(
  command,
  args,
  options,
  taskMetadata,
) {
  const dangerousPatterns = [
    { pattern: /--force/, operation: 'git force push' },
    { pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i, operation: 'schema drop' },
    { pattern: /DELETE\s+FROM/i, operation: 'bulk delete' },
    { pattern: /\.beads\//, operation: 'beads directory write' },
  ];

  for (const { pattern, operation } of dangerousPatterns) {
    if (command.match(pattern) || args.some((arg) => arg.match(pattern))) {
      if (taskMetadata?.irreversible) {
        throw new IrreversibleActionError(
          `DANGEROUS: ${operation} detected. Task marked as irreversible requires human approval.`,
          operation,
        );
      }
    }
  }
}

export function validateTaskMetadata(metadata) {
  if (!metadata) return { valid: true, warnings: [] };

  if (metadata.irreversible && !metadata.requires_human_approval) {
    return {
      valid: false,
      warnings: ['Irreversible flag set but requires_human_approval is false'],
    };
  }

  return { valid: true, warnings: [] };
}
