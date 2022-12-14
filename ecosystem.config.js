module.exports = {
  apps: [
    {
      name: "avax-pool",
      script: "src/pool/service.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "2000M",
      watch: false,
      time: true
    },
    {
      name: "leaderboard",
      script: "src/leaderboard/service.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "4000M",
      watch: false,
      time: true
    },
    {
      name: "sharks",
      script: "src/sharks/service.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "4000M",
      watch: false,
      time: true
    },
    {
      name: "proxy",
      script: "src/leaderboard/proxy.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "2000M",
      watch: false,
      time: true
    },
    {
      name: "botsignal",
      script: "src/botsignal/service.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "2000M",
      watch: false,
      time: true
    }
  ]
};