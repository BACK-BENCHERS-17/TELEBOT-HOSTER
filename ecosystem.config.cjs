module.exports = {
  apps: [{
    name: 'telebot-hoster',
    script: './server/index.ts',
    interpreter: 'node',
    interpreterArgs: '--import tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: process.env.PORT || 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};
