import { Elysia } from "elysia";
import { apiController } from "./modules/controllers";
import { serverTiming } from '@elysiajs/server-timing'

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .get("/check_service", () => ({
    result: "ok",
  }))
  // .use(serverTiming())
  .use(apiController)
  .listen(process.env.API_PORT || 3000);

export type BackendApp = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
