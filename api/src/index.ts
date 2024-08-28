import { Elysia } from "elysia";
import { apiController } from "./modules/controllers";
import { serverTiming } from '@elysiajs/server-timing'
import { loggingMiddleware } from "./loggingMiddleware";
import { logger } from "./logger";
import otelMiddleware from "./otelMiddleware";
import { opentelemetry } from '@elysiajs/opentelemetry'

import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { cors } from "@elysiajs/cors";
import app from "./app";



app.listen(process.env.API_PORT || 3000);




console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
