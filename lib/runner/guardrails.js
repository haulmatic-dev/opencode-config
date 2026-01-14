import { dirname } from 'node:path';
import url from 'node:url';

const { fileURLToPath } = url;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class GuardrailException extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'GuardrailException';
    this.rule = rule;
  }
}

export class CommandInterceptor {
  constructor(taskId) {
    this.taskId = taskId;
    this.projectRoot = dirname(dirname(__dirname));
  }

  checkFileWrite(filePath) {
    // Deny if .beads/ path
    if (filePath.includes('.beads') || filePath.includes('/.beads/')) {
      throw new GuardrailException(
        `File write denied: Cannot write to .beads/ directory`,
        'no_beads_write',
      );
    }

    // Deny if no task_id
    if (!this.taskId) {
      throw new GuardrailException(
        `File write denied: No task_id provided. Use --task <ID>`,
        'no_task_id',
      );
    }
  }

  checkGitCommit(message) {
    if (!message || !message.includes('opencode-')) {
      throw new GuardrailException(
        `Git commit denied: Message must include task_id (e.g., "opencode-xxx: description")`,
        'no_task_id_in_commit',
      );
    }
  }

  checkGitCheckout(branchName) {
    const forbiddenBranches = ['main', 'develop', 'master'];

    if (forbiddenBranches.includes(branchName)) {
      throw new GuardrailException(
        `Git checkout denied: Cannot checkout to shared branch '${branchName}'. All work must happen in isolated task branches matching pattern: beads/task-{id}`,
        'forbidden_branch',
      );
    }

    const expectedBranch = `beads/task-${this.taskId}`;
    if (branchName !== expectedBranch) {
      throw new GuardrailException(
        `Git checkout denied: Branch '${branchName}' does not match required pattern. Expected: ${expectedBranch}`,
        'invalid_task_branch',
      );
    }
  }
}

// Singleton instance
let interceptorInstance = null;

export function getInterceptor(taskId) {
  if (!interceptorInstance) {
    interceptorInstance = new CommandInterceptor(taskId);
  }
  return interceptorInstance;
}
