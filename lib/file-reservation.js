/**
 * @fileoverview File reservation system with TTL support
 * @module lib/file-reservation
 */

const reservations = new Map();
let cleanupInterval = null;
const DEFAULT_TTL = 60000;

/**
 * @typedef {Object} Reservation
 * @property {string} filePath - Path to the reserved file
 * @property {string} owner - Owner identifier
 * @property {number} expiration - Expiration timestamp
 * @property {number} ttl - Time to live in milliseconds
 */

/**
 * Start the cleanup interval for expired reservations
 * @param {number} interval - Check interval in milliseconds
 */
function startCleanup(interval = 1000) {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  cleanupInterval = setInterval(cleanupExpired, interval);
}

/**
 * Stop the cleanup interval
 */
function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Remove all expired reservations
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [filePath, reservation] of reservations) {
    if (reservation.expiration <= now) {
      reservations.delete(filePath);
    }
  }
}

/**
 * Reserve a file for an owner with a TTL
 * @param {string} filePath - Path to the file to reserve
 * @param {string} owner - Owner identifier
 * @param {number} [ttl=60000] - Time to live in milliseconds
 * @returns {Reservation|null} The reservation or null if already reserved
 */
function reserve(filePath, owner, ttl = DEFAULT_TTL) {
  if (reservations.has(filePath)) {
    return null;
  }
  const expiration = Date.now() + ttl;
  const reservation = { filePath, owner, expiration, ttl };
  reservations.set(filePath, reservation);
  return reservation;
}

/**
 * Release a reservation for a file by owner
 * @param {string} filePath - Path to the file
 * @param {string} owner - Owner identifier
 * @returns {boolean} True if released, false if not found or wrong owner
 */
function release(filePath, owner) {
  const reservation = reservations.get(filePath);
  if (!reservation || reservation.owner !== owner) {
    return false;
  }
  return reservations.delete(filePath);
}

/**
 * Check if a file is currently reserved
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if reserved
 */
function isReserved(filePath) {
  const reservation = reservations.get(filePath);
  if (!reservation) return false;
  if (reservation.expiration <= Date.now()) {
    reservations.delete(filePath);
    return false;
  }
  return true;
}

/**
 * Get the reservation status for a file
 * @param {string} filePath - Path to the file
 * @returns {Object|null} Status object or null if not reserved
 */
function getStatus(filePath) {
  const reservation = reservations.get(filePath);
  if (!reservation) return null;
  const now = Date.now();
  if (reservation.expiration <= now) {
    reservations.delete(filePath);
    return null;
  }
  return {
    filePath: reservation.filePath,
    owner: reservation.owner,
    expiration: new Date(reservation.expiration).toISOString(),
    remaining: Math.max(0, reservation.expiration - now),
    ttl: reservation.ttl,
  };
}

/**
 * Get all current reservations
 * @returns {Array<Object>} Array of reservation status objects
 */
function getAllReservations() {
  const now = Date.now();
  const result = [];
  for (const [filePath, reservation] of reservations) {
    if (reservation.expiration <= now) {
      reservations.delete(filePath);
    } else {
      result.push({
        filePath: reservation.filePath,
        owner: reservation.owner,
        expiration: new Date(reservation.expiration).toISOString(),
        remaining: reservation.expiration - now,
        ttl: reservation.ttl,
      });
    }
  }
  return result;
}

/**
 * Force release a reservation (admin function)
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if released
 */
function forceRelease(filePath) {
  return reservations.delete(filePath);
}

/**
 * Clear all reservations
 * @returns {number} Number of reservations cleared
 */
function clearAll() {
  const count = reservations.size;
  reservations.clear();
  return count;
}

startCleanup();

export {
  reserve,
  release,
  isReserved,
  getStatus,
  getAllReservations,
  forceRelease,
  clearAll,
  startCleanup,
  stopCleanup,
  cleanupExpired,
};
