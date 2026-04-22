module.exports = {
  apps: [
    {
      name: 'gomoku-fusion-v2',
      cwd: '/opt/gomoku-fusion-v2',
      script: 'npm',
      args: 'run start:multiplayer',
      env: {
        NODE_ENV: 'production',
        PORT: '3010',
      },
    },
  ],
}
