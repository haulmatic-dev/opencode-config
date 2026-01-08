import fs from 'fs';
import path from 'path';

export const BeadsStep3 = async ({ project, client, $, directory, worktree }) => {
  const beadsDir = path.join(directory, '.beads');
  const beadsActive = fs.existsSync(beadsDir);
  console.log("BeadsStep3: .beads exists =", beadsActive);
  
  return {
    'tool.execute.before': async (input, output) => {
      console.log("BeadsStep3: tool.execute.before", input.tool);
      
      if (input.tool === 'todowrite' && beadsActive) {
        console.log('[beads-guardrails] Blocking TodoWrite in beads workspace');
        throw new Error('[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.');
      }
    }
  };
};
