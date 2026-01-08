const fs = require('fs');
const path = require('path');

async function beadsGuardrailsPlugin(input) {
  const { directory, project } = input;
  
  const beadsDir = path.join(directory, '.beads');
  const beadsActive = fs.existsSync(beadsDir);
  
  console.log('[beads-guardrails] Initialized');
  console.log('[beads-guardrails] Beads workspace:', beadsActive ? 'ACTIVE' : 'NOT ACTIVE');
  
  return {
    'tool.execute.before': async (input, output) => {
      const { tool, sessionID } = input;
      
      console.log('[beads-guardrails] tool.execute.before called for:', tool);
      
      if (tool === 'TodoWrite' && beadsActive) {
        console.log('[beads-guardrails] Blocking TodoWrite in beads workspace');
        
        const errorMsg = '[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.';
        
        output.args = null;
        throw new Error(errorMsg);
      }
    },
    
    'tool.execute.after': async (input, output) => {
      const { tool } = input;
      console.log('[beads-guardrails] tool.execute.after called for:', tool);
    }
  };
}

export default beadsGuardrailsPlugin;
