import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

let reservationManager = null;
let useMcpFallback = false;
const FALLBACK_LOCK_DIR = '.file-locks';

class FallbackFileLock {
  constructor(lockDir = FALLBACK_LOCK_DIR) {
    this.lockDir = lockDir;
    if (!existsSync(this.lockDir)) {
      try {
        writeFileSync(this.lockDir, '', { flag: 'wx' });
      } catch {
        useMcpFallback = true;
      }
    }
  }

  acquire(filePath, owner) {
    if (useMcpFallback) {
      return this.acquireFs(filePath, owner);
    }
    const lockFile = join(
      this.lockDir,
      Buffer.from(filePath).toString('base64'),
    );
    try {
      writeFileSync(lockFile, JSON.stringify({ owner, acquired: Date.now() }), {
        flag: 'wx',
      });
      return true;
    } catch {
      return false;
    }
  }

  acquireFs(filePath, owner) {
    const lockFile = `${filePath}.lock`;
    if (existsSync(lockFile)) {
      return false;
    }
    try {
      writeFileSync(lockFile, JSON.stringify({ owner, acquired: Date.now() }));
      return true;
    } catch {
      return false;
    }
  }

  release(filePath, owner) {
    if (useMcpFallback) {
      return this.releaseFs(filePath, owner);
    }
    const lockFile = join(
      this.lockDir,
      Buffer.from(filePath).toString('base64'),
    );
    if (!existsSync(lockFile)) {
      return false;
    }
    try {
      const content = readFileSync(lockFile, 'utf8');
      const data = JSON.parse(content);
      if (data.owner !== owner) {
        return false;
      }
      unlinkSync(lockFile);
      return true;
    } catch {
      return false;
    }
  }

  releaseFs(filePath, owner) {
    const lockFile = `${filePath}.lock`;
    if (!existsSync(lockFile)) {
      return false;
    }
    try {
      const content = readFileSync(lockFile, 'utf8');
      const data = JSON.parse(content);
      if (data.owner !== owner) {
        return false;
      }
      unlinkSync(lockFile);
      return true;
    } catch {
      return false;
    }
  }

  isLocked(filePath) {
    if (useMcpFallback) {
      return existsSync(`${filePath}.lock`);
    }
    const lockFile = join(
      this.lockDir,
      Buffer.from(filePath).toString('base64'),
    );
    return existsSync(lockFile);
  }
}

async function getReservationManager() {
  if (reservationManager) {
    return reservationManager;
  }

  try {
    const modulePath = new URL('../lib/file-reservation.js', import.meta.url);
    if (existsSync(modulePath)) {
      const lib = await import(modulePath.href);
      reservationManager = {
        reserve: (filePath, owner, ttl) => lib.reserve(filePath, owner, ttl),
        release: (filePath, owner) => lib.release(filePath, owner),
        isReserved: (filePath) => lib.isReserved(filePath),
        getStatus: (filePath) => lib.getStatus(filePath),
      };
      console.log('[file-reservation] Using lib/file-reservation.js');
      return reservationManager;
    }
  } catch (e) {
    console.log(
      '[file-reservation] lib/file-reservation.js unavailable:',
      e.message,
    );
  }

  try {
    const runnerPath = new URL(
      '../lib/runner/file-reservation.js',
      import.meta.url,
    );
    if (existsSync(runnerPath)) {
      const lib = await import(runnerPath.href);
      reservationManager = {
        reserve: (filePath, owner, ttl) =>
          lib.default.acquire([filePath], { owner, ttl }),
        release: (filePath, owner) => lib.default.release([filePath]),
        isReserved: (filePath) =>
          lib.default.status().some((r) => r.filePatterns.includes(filePath)),
        getStatus: (filePath) =>
          lib.default.status().find((r) => r.filePatterns.includes(filePath)),
      };
      console.log('[file-reservation] Using lib/runner/file-reservation.js');
      return reservationManager;
    }
  } catch (e) {
    console.log(
      '[file-reservation] lib/runner/file-reservation.js unavailable:',
      e.message,
    );
  }

  console.log('[file-reservation] Using fallback file-based locking');
  reservationManager = new FallbackFileLock();
  useMcpFallback = true;
  return reservationManager;
}

export const fileReservation = async ({
  project: _project,
  client: _client,
  $: _$,
  directory: _directory,
  worktree: _worktree,
}) => {
  const pendingReservations = new Map();
  let manager = null;

  return {
    'tool.execute.before': async (input, _output) => {
      if (!manager) {
        manager = await getReservationManager();
      }

      const toolName = input.tool || input.function || input.name;
      if (toolName !== 'write') {
        return;
      }

      const filePath = input.filePath || input.arguments?.filePath;
      if (!filePath) {
        return;
      }

      const owner = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const reserved = manager.reserve(filePath, owner, 30000);
      if (reserved) {
        pendingReservations.set(owner, filePath);
        console.log(`[file-reservation] Reserved: ${filePath}`);
      } else {
        console.log(`[file-reservation] Already locked: ${filePath}`);
      }
    },

    'tool.execute.after': async (input, _output, error) => {
      if (!manager) {
        return;
      }

      const toolName = input.tool || input.function || input.name;
      if (toolName !== 'write') {
        return;
      }

      const filePath = input.filePath || input.arguments?.filePath;
      if (!filePath) {
        return;
      }

      for (const [owner, reservedPath] of pendingReservations) {
        if (reservedPath === filePath) {
          const released = manager.release(filePath, owner);
          if (released) {
            pendingReservations.delete(owner);
            console.log(`[file-reservation] Released: ${filePath}`);
          }
        }
      }
    },

    'agent.execute.after': async (_input, _output) => {
      if (pendingReservations.size > 0) {
        console.log(
          `[file-reservation] Cleaning up ${pendingReservations.size} pending reservations`,
        );
        for (const [owner, filePath] of pendingReservations) {
          if (manager) {
            manager.release(filePath, owner);
          }
        }
        pendingReservations.clear();
      }
    },
  };
};
