import {
    order_status,
    orders,
    terminals,
} from "../../../drizzle/schema";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
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
    not,
    sql,
} from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import utc from "dayjs/plugin/utc";

import isToday from "dayjs/plugin/isToday";
import isBetween from "dayjs/plugin/isBetween";

import timezone from "dayjs/plugin/timezone";
import { getSetting } from "../../utils/settings";
import { contextWitUser } from "../../context";
import { MissedOrders } from "./dto/list.dto";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isToday);

export const MissedOrdersController = new Elysia({
    name: "@app/missed_orders",
    prefix: "/api/missed_orders",
})
    .use(contextWitUser)
    .get(
        "/",
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
                isNull(orders.courier_id),
                not(eq(order_status.cancel, true))
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
    .post('/send_yandex', async ({ queues: {
        processCheckAndSendYandex
    }, body: {
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
