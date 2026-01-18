#!/usr/bin/env node

import manager from '../lib/runner/file-reservation.js';

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'status': {
      const reservations = manager.status();
      if (reservations.length === 0) {
        console.log('No active reservations');
        process.exit(0);
      }
      console.log('Active Reservations:');
      reservations.forEach((res) => {
        console.log(`\nOwner: ${res.owner}`);
        console.log(`  Files: ${res.filePatterns.join(', ')}`);
        console.log(`  Expires: ${res.expiration}`);
        console.log(`  Remaining: ${res.remaining}ms`);
      });
      break;
    }

    case 'release': {
      const owner = process.argv[3];
      if (!owner) {
        console.error('Usage: file-reservation.js release <owner>');
        process.exit(1);
      }
      const count = await manager.releaseByOwner(owner);
      console.log(`Released ${count} reservation(s) for owner: ${owner}`);
      break;
    }

    case 'clear': {
      const count = await manager.clear();
      console.log(`Cleared ${count} reservation(s)`);
      break;
    }

    default:
      console.error('Usage: file-reservation.js <command> [args]');
      console.error('Commands:');
      console.error('  status          Show active reservations');
      console.error('  release <owner> Release reservations by owner');
      console.error('  clear           Clear all reservations');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
