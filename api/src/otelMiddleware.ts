import { Elysia } from 'elysia';
import { trace, context } from '@opentelemetry/api';

const otelMiddleware = new Elysia()
    .onRequest(({ request }) => {
        const tracer = trace.getTracer('elysia-app');
        const span = tracer.startSpan(`${request.method} ${request.url}`);
        context.with(trace.setSpan(context.active(), span), () => {
            // Выполнение запроса в контексте span
        });
    })
    .onAfterResponse(({ request }) => {
        const span = trace.getSpan(context.active());
        if (span) {
            span.end();
        }
    })
    .as('global');

export default otelMiddleware;