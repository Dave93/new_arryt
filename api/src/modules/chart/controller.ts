import Elysia, { t } from "elysia";
import { contextWitUser } from "../../context";
import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { orders, terminals } from '../../../drizzle/schema';
import dayjs from "dayjs";

const periodQuerySchema = t.Object({
    start_date: t.String(),
    end_date: t.String(),
    period: t.Union([
        t.Literal("day"),
        t.Literal("week"),
        t.Literal("month"),
        t.Literal("year")
    ]),
    organization_id: t.Optional(t.String()),
    region: t.Optional(t.String())
});

const intervalMap = {
    day: '1 day',
    week: '1 week',
    month: '1 month',
    year: '1 year'
} as const;

export const chartControlller = new Elysia({
    name: '@api/chart',
    prefix: '/api/chart'
})
    .use(contextWitUser)
    .get('/orders_count_per_period', async ({ drizzle, query }) => {
        const { start_date, end_date, period, organization_id, region } = query;
        const interval = intervalMap[period];
        const timeBucket = sql`time_bucket(${interval}, ${orders.created_at}) as bucket_time`;
        const startDate = start_date ? dayjs(start_date).startOf('day').toDate() : dayjs().startOf('day').toDate();
        const endDate = end_date ? dayjs(end_date).endOf('day').toDate() : dayjs().endOf('day').toDate();
        
        const result = await drizzle
            .select({
                period: timeBucket,
                count: sql<number>`count(*)`,
            })
            .from(orders)
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString()),
                organization_id ? eq(orders.organization_id, organization_id) : undefined,
                region && region !== 'all' ? eq(terminals.region, region as 'capital' | 'region') : undefined
            ))
            .groupBy(sql`bucket_time`)
            .orderBy(sql`bucket_time`);

        return result;
    }, {
        permission: 'orders.list',
        query: periodQuerySchema
    })
    .get('/delivery_time_per_period', async ({ drizzle, query }) => {
        const { start_date, end_date, period, organization_id, region } = query;
        const interval = intervalMap[period];
        const timeBucket = sql`time_bucket(${interval}, ${orders.created_at}) as bucket_time`;
        const startDate = start_date ? dayjs(start_date).startOf('day').toDate() : dayjs().startOf('day').toDate();
        const endDate = end_date ? dayjs(end_date).endOf('day').toDate() : dayjs().endOf('day').toDate();
        
        const result = await drizzle
            .select({
                period: timeBucket,
                average_delivery_time: sql<number>`
                    avg(
                        extract(epoch from (${orders.finished_date} - ${orders.created_at})) / 60
                    )
                `,
            })
            .from(orders)
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString()),
                sql`${orders.finished_date} IS NOT NULL`,
                organization_id ? eq(orders.organization_id, organization_id) : undefined,
                region && region !== 'all' ? eq(terminals.region, region as 'capital' | 'region') : undefined
            ))
            .groupBy(sql`bucket_time`)
            .orderBy(sql`bucket_time`);

        return result;
    }, {
        permission: 'orders.list',
        query: periodQuerySchema
    });