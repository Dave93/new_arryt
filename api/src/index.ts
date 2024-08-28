
import cluster from "node:cluster";
import { cpus } from "node:os";
import process from "node:process";
import app from "./app";

if (process.env.NODE_ENV === "development") {
  app.listen(process.env.API_PORT || 3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
} else {
  if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);

    // Start N workers for the number of CPUs
    for (let i = 0; i < 4; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} exited`);
    });
  } else {

    app.listen(process.env.API_PORT || 3000);

    console.log(
      `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
  }

}