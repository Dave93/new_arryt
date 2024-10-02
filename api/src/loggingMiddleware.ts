import { Elysia } from 'elysia';
import { logger } from './logger';

export const loggingMiddleware = new Elysia()
    .onRequest(({ request, set }) => {
        const startTime = performance.now();
        logger.info({
            label: 'Incoming request',
            labels: {
                request_type: 'incoming',
            },
            ...request,
            url: request.url,
            method: request.method,
        });
        (request as any).startTime = startTime;
    })
    .onError(({ error, request }) => {
        logger.error({
            msg: 'Error occurred',
            error: error.message,
            stack: error.stack,
            ...request,
            url: request.url,
            method: request.method,
        });
    })
    .onAfterResponse(({ response, request, set }) => {
        // let shouldLog = true
        // if (request.url.includes('/api/order_status/')) {
        //     shouldLog = false
        // }

        const endTime = performance.now();
        const duration = endTime - (request as any).startTime;
        const isJson = typeof response === 'object'
        const text = isJson
            ? JSON.stringify(response)
            // @ts-ignore
            : response?.toString() ?? ''
        logger.info({
            label: 'Outgoing response',
            response: text,
            // @ts-ignore
            status: set.status,
            labels: {
                request_type: 'outgoing',
            },
            duration: `${duration.toFixed(2)}ms`,
            // @ts-ignore
            ...request,
            // @ts-ignore
            url: request.url,
            // @ts-ignore
            method: request.method,
        });
    })
    .as('global');