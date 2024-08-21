import { Elysia } from "elysia";
import { apiController } from "./modules/controllers";
import { serverTiming } from '@elysiajs/server-timing'
import { loggingMiddleware } from "./loggingMiddleware";
import { logger } from "./logger";
import otelMiddleware from "./otelMiddleware";
import { opentelemetry } from '@elysiajs/opentelemetry'

import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'


const app = new Elysia()
  .use(loggingMiddleware)
  // .use(
  //   opentelemetry({
  //     spanProcessors: [
  //       new BatchSpanProcessor(
  //         new OTLPTraceExporter()
  //       )
  //     ]
  //   })
  // )
  .get("/", () => "Hello Davr")
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
