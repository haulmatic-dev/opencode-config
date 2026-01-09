module.exports = {
  apps: [
    {
      name: 'headless-swarm',
      script: './bin/headless-worker.js',
      instances: 4, // 4 parallel workers (configurable)
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '1G',
      error_file: '~/.config/opencode/logs/err.log',
      out_file: '~/.config/opencode/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
};
