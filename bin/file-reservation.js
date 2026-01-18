#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '.reservations.json');
const DEFAULT_TTL = 60000;

function loadReservations() {
  if (existsSync(DATA_FILE)) {
    try {
      return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveReservations(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function cleanupExpired(data) {
  const now = Date.now();
  const keys = Object.keys(data);
  for (const filePath of keys) {
    if (data[filePath].expiration <= now) {
      delete data[filePath];
    }
  }
}

function reserve(filePath, owner, ttl = DEFAULT_TTL) {
  const data = loadReservations();
  if (data[filePath]) {
    return null;
  }
  const expiration = Date.now() + ttl;
  data[filePath] = { filePath, owner, expiration, ttl };
  saveReservations(data);
  return { filePath, owner, expiration, ttl };
}

function release(filePath, owner) {
  const data = loadReservations();
  const reservation = data[filePath];
  if (!reservation || reservation.owner !== owner) {
    return false;
  }
  delete data[filePath];
  saveReservations(data);
  return true;
}

function getAllReservations() {
  const data = loadReservations();
  cleanupExpired(data);
  saveReservations(data);
  const now = Date.now();
  const result = [];
  for (const filePath of Object.keys(data)) {
    const res = data[filePath];
    result.push({
      filePath: res.filePath,
      owner: res.owner,
      expiration: new Date(res.expiration).toISOString(),
      remaining: Math.max(0, res.expiration - now),
      ttl: res.ttl,
    });
  }
  return result;
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

const command = process.argv[2];

function main() {
  switch (command) {
    case 'status': {
      const list = getAllReservations();
      if (list.length === 0) {
        console.log('No active reservations');
        return;
      }
      console.log('Active Reservations:');
      list.forEach((res) => {
        console.log(`  ${res.filePath}`);
        console.log(`    Owner: ${res.owner}`);
        console.log(`    Expires: ${res.expiration}`);
        console.log(`    Remaining: ${formatTime(res.remaining)}`);
      });
      break;
    }

    case 'reserve': {
      const file = process.argv[3];
      const owner = process.argv[4];
      if (!file || !owner) {
        console.error('Usage: file-reservation.js reserve <file> <owner>');
        process.exit(1);
      }
      const result = reserve(file, owner);
      if (result) {
        console.log(`Reserved: ${file} -> ${owner}`);
      } else {
        console.error(`Failed: ${file} is already reserved`);
        process.exit(1);
      }
      break;
    }

    case 'release': {
      const file = process.argv[3];
      const owner = process.argv[4];
      if (!file || !owner) {
        console.error('Usage: file-reservation.js release <file> <owner>');
        process.exit(1);
      }
      const result = release(file, owner);
      if (result) {
        console.log(`Released: ${file}`);
      } else {
        console.error(`Failed: ${file} not found or owned by different owner`);
        process.exit(1);
      }
      break;
    }

    case 'cleanup': {
      const data = loadReservations();
      const before = Object.keys(data).length;
      cleanupExpired(data);
      saveReservations(data);
      const after = Object.keys(data).length;
      console.log(`Removed ${before - after} expired reservation(s)`);
      break;
    }

    default:
      console.error('Usage: file-reservation.js <command> [args]');
      console.error('Commands:');
      console.error('  status              Show all reservations');
      console.error('  reserve <file> <owner>  Create reservation');
      console.error('  release <file> <owner>  Remove reservation');
      console.error('  cleanup              Remove expired reservations');
      process.exit(1);
  }
}

main();
