import { cors } from "@elysiajs/cors";
import Elysia, { t } from "elysia";
import { loggingMiddleware } from "./loggingMiddleware";
import { apiController } from "./modules/controllers";

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

    .get("/check_service", () => ({
        result: "ok",
    }))
    // .use(serverTiming())
    .use(apiController)
    .get("/davr", async ({
        headers
    }) => {
        console.log('get /', headers['x-real-ip']);
        return 'Hello Davr';
    });

export default app;

export type BackendApp = typeof app;