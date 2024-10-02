import {
    order_status,
    orders,
    terminals,
} from "@api/drizzle/schema";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import dayjs from "dayjs";
import {
    SQLWrapper,
    and,
    desc,
    eq,
    gte,
    inArray,
    isNull,
    lte,
    sql,
} from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import utc from "dayjs/plugin/utc";

import isToday from "dayjs/plugin/isToday";
import isBetween from "dayjs/plugin/isBetween";

import timezone from "dayjs/plugin/timezone";
import { getSetting } from "@api/src/utils/settings";
import { ctx } from "@api/src/context";
import { MissedOrders } from "./dto/list.dto";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isToday);

export const MissedOrdersController = new Elysia({
    name: "@app/missed_orders",
})
    .use(ctx)
    .get(
        "/missed_orders",
        async ({ query: { limit, offset, sort, filters, fields, ext_all }, redis, cacheControl, drizzle }) => {

            const laterMinutes = await getSetting(redis, 'late_order_time');
            let selectFields: SelectedFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, orders, {
                    order_status,
                    terminals
                });
            }
            let whereClause: (SQLWrapper | undefined)[] = [];
            if (filters) {
                whereClause = parseFilterFields(filters, orders, {
                    order_status,
                    terminals
                });
            }

            whereClause.push(...[
                gte(orders.created_at, dayjs().subtract(2, 'hour').minute(0).second(0).format('YYYY-MM-DD HH:mm:ss')),
                lte(orders.created_at, dayjs().subtract(laterMinutes, 'minute').format('YYYY-MM-DD HH:mm:ss')),
                isNull(orders.courier_id)
            ]);

            let isFilteredByTerminal = false;

            if (filters && filters?.length > 0) {
                const parsedFilters = JSON.parse(filters) as { field: string, operator: string, value: string }[];

                isFilteredByTerminal = !!parsedFilters.find((filter) => filter.field === 'terminal_id');
            }

            if (!isFilteredByTerminal) {
                const terminals = await cacheControl.getTerminals();
                const activeTerminalIds = terminals.filter((terminal) => terminal.active).map(t => t.id);
                whereClause.push(inArray(orders.terminal_id, activeTerminalIds));
            }
            console.time('missed_orders');
            const rolesCount = await drizzle
                .select({ count: sql<number>`count(*)` })
                .from(orders)
                .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                .where(and(...whereClause))
                .execute();
            let rolesList = await drizzle
                .select(selectFields)
                .from(orders)
                .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                .where(and(...whereClause))
                .limit(+limit)
                .offset(+offset)
                .orderBy(desc(orders.created_at))
                .execute() as MissedOrders[];
            console.timeEnd('missed_orders');
            return {
                total: rolesCount[0].count,
                data: rolesList,
            };
        },
        {
            permission: 'orders.list',
            query: t.Object({
                limit: t.String(),
                offset: t.String(),
                sort: t.Optional(t.String()),
                filters: t.Optional(t.String()),
                fields: t.Optional(t.String()),
                ext_all: t.Optional(t.Nullable(t.String()))
            }),
        }
    )
    .post('/missed_orders/send_yandex', async ({ processCheckAndSendYandex, body: {
        id
    } }) => {
        await processCheckAndSendYandex.add('checkAndSendYandex', {
            id
        }, { removeOnComplete: true });
        return { status: 'ok' };
    }, {
        permission: 'orders.list',
        body: t.Object({
            id: t.String(),
        }),
    })
