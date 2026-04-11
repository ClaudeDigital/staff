module.exports = {
  apps: [{
    name: 'staff',
    script: 'server.js',
    cwd: '/opt/staff',
    restart_delay: 3000,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
