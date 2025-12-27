module.exports = {
  apps: [
    {
      name: 'api',
      script: 'index.js',

      env: {
        NODE_ENV: 'development',
        APP_ENV: 'local',
      },

      env_production: {
        NODE_ENV: 'production',
        APP_ENV: 'production',
      },
    },
  ],
};


//pm2 start ecosystem.config.js --env production
