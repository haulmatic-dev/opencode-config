import fs from 'node:fs';
import path from 'node:path';

export const BeadsStep3 = async ({
  project: _project,
  client: _client,
  $: _$,
  directory,
  worktree: _worktree,
}) => {
  const beadsDir = path.join(directory, '.beads');
  const beadsActive = fs.existsSync(beadsDir);
  console.log('BeadsStep3: .beads exists =', beadsActive);

  return {
    'tool.execute.before': async (input, _output) => {
      console.log('BeadsStep3: tool.execute.before', input.tool);

      if (input.tool === 'todowrite' && beadsActive) {
        console.log('[beads-guardrails] Blocking TodoWrite in beads workspace');
        throw new Error(
          '[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.',
        );
      }
    },
  };
};
