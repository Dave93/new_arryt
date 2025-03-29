import { cors } from "@elysiajs/cors";
import Elysia from "elysia";
import apiController from "./modules/controllers";
const app = new Elysia()
    .use(
        cors({
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        })
    )
    // .use(loggingMiddleware)
    // .use(
    //   opentelemetry({
    //     spanProcessors: [
    //       new BatchSpanProcessor(
    //         new OTLPTraceExporter()
    //       )
    //     ]
    //   })
    // )

    // .get("/", () => ({
    //     result: "ok",
    // }))
    // .use(serverTiming())
    .use(apiController)
    // .use(OrdersController)
    .get("/check_service", () => ({
        result: "ok",
    }));

export default app;

export type BackendApp = typeof app;