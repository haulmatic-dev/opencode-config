import fs from 'fs';
import path from 'path';

export const BeadsGuardrailsPlugin = async (input) => {
  const { directory, project } = input;
  
  const beadsDir = path.join(directory, '.beads');
  const beadsActive = fs.existsSync(beadsDir);
  
  console.log('[beads-guardrails] Initialized');
  console.log('[beads-guardrails] Beads workspace:', beadsActive ? 'ACTIVE' : 'NOT ACTIVE');
  console.log('[beads-guardrails] Registering hooks...');
  
  return {
    'tool.execute.before': async (input, output) => {
      const { tool, sessionID } = input;
      
      console.log('[beads-guardrails] tool.execute.before called for:', tool);
      
      if (tool === 'todowrite' && beadsActive) {
        console.log('[beads-guardrails] Blocking TodoWrite in beads workspace');
        
        const errorMsg = '[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.';
        
        output.args = null;
        throw new Error(errorMsg);
      }
    }
  };
};
