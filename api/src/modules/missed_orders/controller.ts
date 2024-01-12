import {
    customers, missed_orders,
    order_status,
    orders,
    terminals,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { checkRestPermission } from "@api/src/utils/check_rest_permissions";
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
import { SelectedFields, alias } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import Redis from "ioredis";
import utc from "dayjs/plugin/utc";

import isToday from "dayjs/plugin/isToday";
import isBetween from "dayjs/plugin/isBetween";

import timezone from "dayjs/plugin/timezone";
import { CacheControlService } from "@api/src/modules/cache/service";
import { Queue } from "bullmq"; // dependent on utc plugin
import { getSetting } from "@api/src/utils/settings";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isToday);

export const MissedOrdersController = (
    app: Elysia<
        "",
        {
            store: {
                redis: Redis;
                cacheControl: CacheControlService,
                newOrderNotify: Queue,
                processOrderIndexQueue: Queue,
                processFromBasketToCouriers: Queue,
                processCheckAndSendYandex: Queue,
            };
            bearer: string;
            request: {};
            schema: {};
        }
    >
) =>
    app
        .get(
            "/api/missed_orders",
            async ({ query: { limit, offset, sort, filters, fields, ext_all }, store: { redis, cacheControl } }) => {

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

                const rolesCount = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(orders)
                    .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                    .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                    .where(and(...whereClause))
                    .execute();
                console.log('query', db
                    .select(selectFields)
                    .from(orders)
                    .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                    .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                    .where(and(...whereClause))
                    .limit(+limit)
                    .offset(+offset)
                    .orderBy(desc(orders.created_at)).toSQL().sql);
                let rolesList = await db
                    .select(selectFields)
                    .from(orders)
                    .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                    .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                    .where(and(...whereClause))
                    .limit(+limit)
                    .offset(+offset)
                    .orderBy(desc(orders.created_at))
                    .execute();
                return {
                    total: rolesCount[0].count,
                    data: rolesList,
                };
            },
            {
                query: t.Object({
                    limit: t.String(),
                    offset: t.String(),
                    sort: t.Optional(t.String()),
                    filters: t.Optional(t.String()),
                    fields: t.Optional(t.String()),
                    ext_all: t.Optional(t.Nullable(t.String()))
                }),
                beforeHandle: checkRestPermission,
            }
        )
        .decorate('permission', 'orders.list')
        .post('/api/missed_orders/send_yandex', async ({ store: { processCheckAndSendYandex }, body: {
            id
        } }) => {
            await processCheckAndSendYandex.add('checkAndSendYandex', {
                id
            }, { removeOnComplete: true });
            return { status: 'ok' };
        }, {
            body: t.Object({
                id: t.String(),
            }),
            beforeHandle: checkRestPermission,
        });
