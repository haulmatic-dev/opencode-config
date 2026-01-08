const fs = require('fs');
const path = require('path');

console.log('Testing beads guardrails plugin...');
console.log('Current directory:', process.cwd());
console.log('.beads exists:', fs.existsSync('.beads'));

const plugin = require('./beads-guardrails-plugin');

const mockInput = {
  directory: '/Users/buddhi/.config/opencode',
  project: { id: 'opencode', name: 'opencode' },
  worktree: '/Users/buddhi/.config/opencode',
  serverUrl: new URL('http://localhost:4096'),
  $: {}
};

plugin(mockInput).then(async (hooks) => {
  console.log('\\nPlugin initialized with hooks:', Object.keys(hooks));
  
  const beforeHook = hooks['tool.execute.before'];
  
  console.log('\\n--- Test 1: TodoWrite in beads workspace ---');
  const output1 = { args: { todos: [{ content: 'test' }] } };
  try {
    await beforeHook({ tool: 'TodoWrite', sessionID: 'test-123' }, output1);
    console.log('❌ FAILED: TodoWrite was not blocked');
    process.exit(1);
  } catch (err) {
    console.log('✅ PASSED: TodoWrite blocked with:', err.message);
  }
  
  console.log('\\n--- Test 2: Read tool in beads workspace ---');
  const output2 = { args: { filePath: 'test.txt' } };
  try {
    await beforeHook({ tool: 'Read', sessionID: 'test-456' }, output2);
    console.log('✅ PASSED: Read tool allowed');
  } catch (err) {
    console.log('❌ FAILED: Read tool blocked:', err.message);
    process.exit(1);
  }
  
  console.log('\\n--- Test 3: TodoWrite in non-beads workspace ---');
  const mockInput2 = { ...mockInput, directory: '/tmp/no-beads' };
  const hooks2 = await plugin(mockInput2);
  const beforeHook2 = hooks2['tool.execute.before'];
  const output3 = { args: { todos: [] } };
  try {
    await beforeHook2({ tool: 'TodoWrite', sessionID: 'test-789' }, output3);
    console.log('✅ PASSED: TodoWrite allowed when beads not active');
  } catch (err) {
    console.log('❌ FAILED: TodoWrite blocked when beads not active:', err.message);
    process.exit(1);
  }
  
  console.log('\\n✅ All tests passed!');
});
