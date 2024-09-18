import { cors } from "@elysiajs/cors";
import Elysia from "elysia";
import { loggingMiddleware } from "./loggingMiddleware";
import { staticPlugin } from '@elysiajs/static'
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
    .get("/", () => {
        console.log('get /');
        return 'Hello Davr';
    })
    .get("/check_service", () => ({
        result: "ok",
    }))
    // .use(serverTiming())
    .use(apiController);

export default app;

export type BackendApp = typeof app;