function parseArguments() {
  const args = process.argv.slice(2);
  const parsed = {
    task: null,
    agent: null,
    workflow: 'feature-dev',
    help: false,
    requireReservations: true,
    filePatterns: [],
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--task':
        parsed.task = args[++i];
        break;
      case '--agent':
        parsed.agent = args[++i];
        break;
      case '--workflow':
        parsed.workflow = args[++i];
        break;
      case '--file-patterns': {
        const patterns = args[++i];
        parsed.filePatterns = patterns
          ? patterns.split(',').map((p) => p.trim())
          : [];
        break;
      }
      case '--no-reservation-check':
        parsed.requireReservations = false;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
    }
  }

  if (!parsed.task) {
    console.error('Error: --task <ID> is required');
    console.error(
      'Usage: node lib/runner/index.js --task <ID> --agent <TYPE> [--workflow <TYPE>] [--file-patterns <PATTERNS>] [--no-reservation-check]',
    );
    process.exit(1);
  }

  if (!parsed.agent) {
    console.error('Error: --agent <TYPE> is required');
    process.exit(1);
  }

  return parsed;
}

export { parseArguments };
