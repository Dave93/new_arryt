import { cors } from "@elysiajs/cors";
import Elysia, { t } from "elysia";
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

    .get("/check_service", () => ({
        result: "ok",
    }))
    // .use(serverTiming())
    .use(apiController)
    .get("/davr", async ({
        cookie: {
            sessionId
        }
    }) => {
        console.log('sessionId', sessionId.value);
        console.log('get /');
        return 'Hello Davr';
    }, {
        cookie: t.Cookie({
            sessionId: t.Optional(t.String({
            }))
        }, {

        })
    });

export default app;

export type BackendApp = typeof app;