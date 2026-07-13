// pm2 config for the Oracle ARM VPS — `pm2 start ecosystem.config.cjs`
module.exports = {
  apps: [
    {
      name: "clean402-server",
      script: "src/server.js",
      autorestart: true,
      max_restarts: 50,
      restart_delay: 5000,
      env: { NODE_ENV: "production" },
    },
    {
      name: "clean402-agent",
      script: "src/agent.js",
      autorestart: true,
      max_restarts: 50,
      restart_delay: 10000,
      env: { NODE_ENV: "production" },
    },
    {
      name: "clean402-sweep",
      script: "src/sweep.js",
      autorestart: false,
      cron_restart: "*/30 * * * *", // sweep revenue back to the payer every 30 min
    },
  ],
};
