module.exports = {
  name: "arryt_queues", // Name of your application
  script: "index.ts", // Entry point of your application
  interpreter: "/root/.bun/bin/bun", // Path to the Bun interpreter
  instances: "max",
  exec_mode: "cluster",
};
