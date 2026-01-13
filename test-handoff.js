import { executeHandoff } from './lib/runner/handoff.js';

const taskId = process.argv[2] || 'opencode-ej0';

console.log('Testing executeHandoff function...');

const result = await executeHandoff(taskId);

console.log('\n=== Handoff Complete ===');
console.log('Final State:', result.finalState);
console.log('Iterations:', result.iterations);
if (result.error) {
  console.log('Error:', result.error);
}

process.exit(result.error ? 1 : 0);
