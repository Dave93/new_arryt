import pino from 'pino';
import type { LokiOptions } from 'pino-loki';

const transport = pino.transport<LokiOptions>({
    target: "pino-loki",

    options: {

        labels: {
            app: 'arryt_api'
        },
        batching: true,
        interval: 5,
        host: 'http://localhost:3100',

        // Если требуется аутентификация, раскомментируйте следующие строки:
        // basicAuth: {
        //   username: "username",
        //   password: "password",
        // },
    },
});

export const logger = pino(transport);

export function logRequest(req: Request, data: Record<string, any> = {}) {
    logger.info({
        msg: 'Incoming request',
        method: req.method,
        url: req.url,
        ...data,
    });
}

export function logResponse(req: Request, res: Response, data: Record<string, any> = {}) {
    logger.info({
        msg: 'Outgoing response',
        method: req.method,
        url: req.url,
        status: res.status,
        duration: data.duration ? `${data.duration.toFixed(2)}ms` : undefined,
        ...data,
    });
}

export function logError(error: Error, req: Request, data: Record<string, any> = {}) {
    logger.error({
        msg: 'Error occurred',
        method: req.method,
        url: req.url,
        error: error.message,
        stack: error.stack,
        ...data,
    });
}