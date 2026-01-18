class FileReservationManager {
  constructor() {
    this.reservations = new Map();
    this.cleanupHandlers = [];
    this.initCleanup();
  }

  initCleanup() {
    const cleanup = () => {
      this.reservations.clear();
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    this.cleanupHandlers.push(cleanup);
  }

  matchesPatterns(patterns, file) {
    return patterns.some((pattern) => {
      const regex = new RegExp(
        '^' +
          pattern
            .replace(/\*/g, '.*')
            .replace(/\/\*\*/g, '(?:.*/)?')
            .replace(/\//g, '\\/') +
          '$',
      );
      return regex.test(file);
    });
  }

  async acquire(filePatterns, options = {}) {
    const { ttl = 30000, owner } = options;
    const id = `${owner}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiration = Date.now() + ttl;

    const reservation = {
      id,
      owner,
      filePatterns,
      expiration,
      ttl,
    };

    this.reservations.set(id, reservation);

    if (ttl > 0) {
      setTimeout(() => {
        this.reservations.delete(id);
      }, ttl);
    }

    return {
      id,
      owner,
      filePatterns,
      expiration,
      release: () => this.releaseById(id),
    };
  }

  async releaseById(id) {
    return this.reservations.delete(id);
  }

  async release(filePatterns) {
    const idsToDelete = [];
    for (const [id, reservation] of this.reservations) {
      for (const pattern of filePatterns) {
        for (const reservedPattern of reservation.filePatterns) {
          if (this.matchesPatterns([reservedPattern], pattern)) {
            idsToDelete.push(id);
            break;
          }
        }
      }
    }

    for (const id of idsToDelete) {
      this.reservations.delete(id);
    }
    return idsToDelete.length;
  }

  async releaseByOwner(owner) {
    const idsToDelete = [];
    for (const [id, reservation] of this.reservations) {
      if (reservation.owner === owner) {
        idsToDelete.push(id);
      }
    }

    for (const id of idsToDelete) {
      this.reservations.delete(id);
    }
    return idsToDelete.length;
  }

  async clear() {
    const count = this.reservations.size;
    this.reservations.clear();
    return count;
  }

  status() {
    const now = Date.now();
    return Array.from(this.reservations.values()).map((res) => ({
      id: res.id,
      owner: res.owner,
      filePatterns: res.filePatterns,
      expiration: new Date(res.expiration).toISOString(),
      remaining: Math.max(0, res.expiration - now),
    }));
  }
}

const manager = new FileReservationManager();
export default manager;
export { FileReservationManager };
