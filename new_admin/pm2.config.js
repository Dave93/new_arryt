module.exports = {
    apps: [
      {
        name: process.env.PM2_APP_NAME,
        script: "npm",
        args: "run start",
        interpreter: "/root/.nvm/versions/node/v20.19.0/bin/node",
        env: {
          PORT: 3000,
          NODE_ENV: "development",
        },
        env_production: {
          PORT: process.env.NODE_PORT,
          NODE_ENV: "production",
        },
      },
    ],
  };