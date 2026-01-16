import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { tool } from '@opencode-ai/plugin/tool';

const execAsync = promisify(exec);

const BIN_DIR = new URL('../bin', import.meta.url).pathname;
const WORKSPACE_INIT = `${BIN_DIR}/workspace-init`;
const SYSTEM_INIT = `${BIN_DIR}/opencode-init`;

class InitCommandsManager {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
  }

  async runWorkspaceInit(force = false) {
    const cmd = force ? `${WORKSPACE_INIT} --force` : WORKSPACE_INIT;
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 120000,
      });
      return { success: true, output: stdout, error: stderr || null };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
        stderr: error.stderr || '',
      };
    }
  }

  async runSystemInit(quiet = false) {
    const cmd = quiet ? `${SYSTEM_INIT} --quiet` : SYSTEM_INIT;
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 300000,
      });
      return { success: true, output: stdout, error: stderr || null };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
        stderr: error.stderr || '',
      };
    }
  }

  async checkWorkspaceStatus() {
    const hasGit = existsSync(`${process.cwd()}/.git`);
    const hasBeads = existsSync(`${process.cwd()}/.beads`);
    const hasCass = existsSync(`${process.cwd()}/.cass`);
    const hasTLDR = existsSync(`${process.cwd()}/.tldr`);

    return {
      initialized: hasGit && hasBeads && hasCass,
      git: hasGit,
      beads: hasBeads,
      cass: hasCass,
      tldr: hasTLDR,
    };
  }

  async checkSystemStatus() {
    const tools = [
      { cmd: 'cm', name: 'cass_memory' },
      { cmd: 'bd', name: 'beads_cli' },
      { cmd: 'bv', name: 'beads_viewer' },
      { cmd: 'biome', name: 'biome' },
      { cmd: 'prettier', name: 'prettier' },
      { cmd: 'tldr', name: 'tldr' },
      { cmd: 'ubs', name: 'ubs' },
      { cmd: 'pm2', name: 'pm2' },
      { cmd: 'osgrep', name: 'osgrep' },
      { cmd: 'gptcache-server', name: 'gptcache' },
    ];

    const status = {};
    for (const { cmd, name } of tools) {
      try {
        await execAsync(`command -v ${cmd}`, { stdio: 'pipe' });
        status[name] = true;
      } catch {
        status[name] = false;
      }
    }

    try {
      await execAsync('command -v opencode-init', { stdio: 'pipe' });
      status.opencode_init = true;
    } catch {
      status.opencode_init = false;
    }

    return status;
  }

  async checkServicesStatus() {
    const services = {
      tldr_daemon: {
        check: 'tldr daemon status',
        runningPattern: /Status:\\s*ready/i,
        name: 'TLDR daemon',
      },
      gptcache: {
        check: 'lsof -i :8000 | grep LISTEN',
        name: 'GPTCache',
      },
      cass_memory: {
        check: 'pgrep -f "cass"',
        name: 'cass_memory',
      },
    };

    const status = {};
    for (const [key, service] of Object.entries(services)) {
      try {
        const { stdout } = await execAsync(service.check, { stdio: 'pipe' });
        if (service.runningPattern) {
          status[key] = service.runningPattern.test(stdout);
        } else {
          status[key] = stdout.trim().length > 0;
        }
      } catch {
        status[key] = false;
      }
    }

    return status;
  }

  async startServices() {
    const results = {};

    try {
      await execAsync('command -v tldr && tldr daemon start', {
        timeout: 10000,
      });
      results.tldr_daemon = true;
    } catch {
      results.tldr_daemon = false;
    }

    try {
      await execAsync('command -v gptcache-server && gptcache-server', {
        timeout: 5000,
      });
      results.gptcache = true;
    } catch {
      results.gptcache = false;
    }

    try {
      await execAsync('command -v cass && cass index --full', {
        timeout: 10000,
      });
      results.cass_memory = true;
    } catch {
      results.cass_memory = false;
    }

    return results;
  }
}

let plugin = null;

export const InitCommandsPlugin = async () => {
  if (!plugin) {
    plugin = new InitCommandsManager();
  }

  return {
    tool: {
      workspace_init: tool({
        description:
          'Initialize this project workspace with opencode (git, cass_memory, Beads, TLDR, Biome, Prettier, git hooks). Run this in a project directory to set up the development environment.',
        args: {
          force: tool.schema.optional(
            tool.schema.boolean({
              description:
                'Run in non-interactive mode with default answers (useful for CI/CD)',
            }),
          ),
        },
        async execute({ force = false }) {
          const result = await plugin.runWorkspaceInit(force);
          if (result.success) {
            return `✅ Workspace initialization completed successfully!\n\n${result.output}`;
          } else {
            return `❌ Workspace initialization failed:\n${result.error}\n\n${result.stderr || result.output}`;
          }
        },
      }),

      opencode_init: tool({
        description:
          'Install and configure opencode system-wide tools (cass_memory, Beads, TLDR, Biome, Prettier, UBS). This sets up your development environment.',
        args: {
          quiet: tool.schema.optional(
            tool.schema.boolean({
              description:
                'Run in quiet mode without interactive prompts (useful for automation)',
            }),
          ),
        },
        async execute({ quiet = false }) {
          const result = await plugin.runSystemInit(quiet);
          if (result.success) {
            return `✅ System initialization completed successfully!\n\n${result.output}`;
          } else {
            return `❌ System initialization failed:\n${result.error}\n\n${result.stderr || result.output}`;
          }
        },
      }),

      workspace_status: tool({
        description:
          'Check the current workspace initialization status (git, cass_memory, Beads, TLDR) and system tools availability.',
        args: {},
        async execute() {
          const status = await plugin.checkWorkspaceStatus();
          const systemStatus = await plugin.checkSystemStatus();
          const servicesStatus = await plugin.checkServicesStatus();

          let message = '## Workspace Status\n\n';
          message += `Git: ${status.git ? '✅' : '❌'} initialized\n`;
          message += `cass_memory: ${status.cass ? '✅' : '❌'} initialized\n`;
          message += `Beads: ${status.beads ? '✅' : '❌'} initialized\n`;
          message += `TLDR: ${status.tldr ? '✅' : '⚪'} indexed\n`;
          message += '\n## System Tools\n\n';

          const missingTools = [];
          for (const [tool, installed] of Object.entries(systemStatus)) {
            if (tool !== 'opencode_init') {
              message += `${installed ? '✅' : '❌'} ${tool}: ${installed ? 'installed' : 'missing'}\n`;
              if (!installed) {
                missingTools.push(tool);
              }
            }
          }

          message += '\n## Services\n\n';
          message += `${servicesStatus.tldr_daemon ? '✅' : '❌'} TLDR daemon: ${servicesStatus.tldr_daemon ? 'running' : 'stopped'}\n`;
          message += `${servicesStatus.gptcache ? '✅' : '❌'} GPTCache: ${servicesStatus.gptcache ? 'running' : 'stopped'}\n`;
          message += `${servicesStatus.cass_memory ? '✅' : '❌'} cass_memory: ${servicesStatus.cass_memory ? 'running' : 'stopped'}\n`;

          message += '\n';

          if (missingTools.length > 0) {
            message += `⚠️  Missing tools: ${missingTools.join(', ')}\n`;
            message += `Run: opencode_init\n\n`;
          }

          if (!status.initialized) {
            message += `⚠️  Workspace not fully initialized\n`;
            message += `Run: workspace_init\n\n`;
          }

          if (!systemStatus.opencode_init) {
            message += `⚠️  opencode-init not in PATH\n`;
            message += `Add to PATH or run: source ~/.zshrc\n\n`;
          }

          return message;
        },
      }),

      services_status: tool({
        description:
          'Check the running status of opencode services (TLDR daemon, GPTCache, cass_memory).',
        args: {},
        async execute() {
          const status = await plugin.checkServicesStatus();

          let message = '## Services Status\n\n';
          message += `TLDR daemon: ${status.tldr_daemon ? '✅ Running' : '❌ Stopped'}\n`;
          message += `GPTCache: ${status.gptcache ? '✅ Running' : '❌ Stopped'}\n`;
          message += `cass_memory: ${status.cass_memory ? '✅ Running' : '❌ Stopped'}\n`;

          const stoppedServices = Object.entries(status)
            .filter(([_, running]) => !running)
            .map(([name]) => name);

          if (stoppedServices.length > 0) {
            message += `\n⚠️  Stopped services: ${stoppedServices.join(', ')}\n`;
            message += `Run: start_services\n`;
          }

          return message;
        },
      }),

      start_services: tool({
        description:
          'Start opencode services (TLDR daemon, GPTCache, cass_memory). Checks if already running first.',
        args: {},
        async execute() {
          const beforeStatus = await plugin.checkServicesStatus();
          const results = await plugin.startServices();
          const afterStatus = await plugin.checkServicesStatus();

          let message = '## Starting Services\n\n';
          for (const [service, started] of Object.entries(results)) {
            const serviceName = service.replace('_', ' ');
            message += `${started ? '✅' : '❌'} ${serviceName}: ${started ? 'started' : 'failed'}\n`;
          }

          message += '\n## Current Status\n\n';
          message += `TLDR daemon: ${afterStatus.tldr_daemon ? '✅ Running' : '❌ Stopped'}\n`;
          message += `GPTCache: ${afterStatus.gptcache ? '✅ Running' : '❌ Stopped'}\n`;
          message += `cass_memory: ${afterStatus.cass_memory ? '✅ Running' : '❌ Stopped'}\n`;

          return message;
        },
      }),
    },
  };
};
