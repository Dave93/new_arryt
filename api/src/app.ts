import { cors } from "@elysiajs/cors";
import Elysia from "elysia";
import apiController from "./modules/controllers";
import staticPlugin from "@elysiajs/static";

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
    .use(staticPlugin({
        assets: "../uploads",
        prefix: "/uploads"
    }))
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