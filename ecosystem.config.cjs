const path = require('node:path');

module.exports = {
  apps: [{
    name: 'componentcare',
    cwd: __dirname,
    script: path.join(__dirname, 'dist-server/server/index.js'),
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    restart_delay: 3000,
    time: true,
    env: { NODE_ENV: 'production' },
  }],
};
