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
    }
  ]
};