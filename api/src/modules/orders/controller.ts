import {
    customers, delivery_pricing, order_actions, order_items,
    order_locations,
    order_status,
    order_transactions,
    orders,
    organization, terminals,
    users, users_terminals,
    customers_comments
} from "../../../drizzle/schema";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import dayjs from "dayjs";
import {
    InferSelectModel,
    SQLWrapper,
    and,
    asc,
    desc,
    eq,
    getTableColumns,
    gte,
    inArray,
    lte,
    sql,
} from "drizzle-orm";
import { SelectedFields, alias } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { GarantReportItem } from "./dtos/reposts.dto";
import { getSetting } from "../../utils/settings";
import { getHours } from "../../lib/dates";
import utc from "dayjs/plugin/utc";

import isToday from "dayjs/plugin/isToday";
import isBetween from "dayjs/plugin/isBetween";

import timezone from "dayjs/plugin/timezone";
import { getMinutes, getMinutesNow } from "../../lib/dates";
import { max, sort } from "radash";
import { prepareOrdersNextButton } from '../../lib/orders';
import { getDistance } from "geolib";
import { contextWitUser } from "../../context";
import { OrderLocationsWithRelations, OrdersWithRelations } from "./dtos/list.dto";
import { DeliveryPricingRulesDto } from "../delivery_pricing/dto/rules.dto";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isToday);

function fancyTimeFormat(duration: number) {
    // Hours, minutes and seconds
    const hrs = ~~(+duration / 3600);
    const mins = ~~((+duration % 3600) / 60);
    const secs = ~~+duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    let ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

type ReportCouriersByTerminal = {
    delivery_price: number;
    courier: string;
    courier_id: string;
    organization_id: string;
    terminal_id: string;
    terminal_name: string;
};

export const OrdersController = new Elysia({
    name: "@app/orders",
})
    .use(contextWitUser)
    .get(
        "/api/orders",
        async ({ query: { limit, offset, sort, filters, fields, ext_all }, drizzle, user }) => {
            const couriers = alias(users, "couriers");
            
            let selectFields: SelectedFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, orders, {
                    organization,
                    order_status,
                    customers,
                    terminals,
                    couriers,
                });
            }
            let whereClause: (SQLWrapper | undefined)[] = [];
            if (filters) {
                whereClause = parseFilterFields(filters, orders, {
                    organization,
                    order_status,
                    customers,
                    terminals,
                    couriers,
                });
                whereClause.push(
                    eq(terminals.active, true)
                )
            }

            if (user?.terminals && user.terminals.length > 0) {
                whereClause.push(
                    inArray(orders.terminal_id, user.terminals)
                )
            }

            const rolesCount = await drizzle
                .select({ count: sql<number>`count(*)` })
                .from(orders)
                .leftJoin(organization, eq(orders.organization_id, organization.id))
                .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                .leftJoin(customers, eq(orders.customer_id, customers.id))
                .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                .leftJoin(couriers, eq(orders.courier_id, couriers.id))
                .where(and(...whereClause))
                .execute();
            let rolesList: OrdersWithRelations[] = [];
            if (ext_all == '1') {
                rolesList = await drizzle
                    .select(selectFields)
                    .from(orders)
                    .leftJoin(organization, eq(orders.organization_id, organization.id))
                    .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                    .leftJoin(customers, eq(orders.customer_id, customers.id))
                    .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                    .leftJoin(couriers, eq(orders.courier_id, couriers.id))
                    .where(and(...whereClause))
                    .offset(+offset)
                    .orderBy(desc(orders.created_at))
                    .execute() as OrdersWithRelations[];
            } else {
                rolesList = await drizzle
                    .select(selectFields)
                    .from(orders)
                    .leftJoin(organization, eq(orders.organization_id, organization.id))
                    .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                    .leftJoin(customers, eq(orders.customer_id, customers.id))
                    .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                    .leftJoin(couriers, eq(orders.courier_id, couriers.id))
                    .where(and(...whereClause))
                    .limit(+limit)
                    .offset(+offset)
                    .orderBy(desc(orders.created_at))
                    .execute() as OrdersWithRelations[];
            }

            if (rolesList.length > 0) {

                const firstOrder = rolesList[0];
                const lastOrder = rolesList[rolesList.length - 1];
                // find order_transactions with transaction_type = 'order_bonus'
                const orderTransactions = await drizzle.select({
                    order_id: order_transactions.order_id,
                    amount: order_transactions.amount,
                }).from(order_transactions).where(and(
                    // inArray(order_transactions.order_id, rolesList.map((order) => order.id)),
                    eq(order_transactions.transaction_type, 'order_bonus'),
                    gte(order_transactions.created_at, dayjs(lastOrder.created_at).subtract(1, 'day').toISOString()),
                    lte(order_transactions.created_at, dayjs(firstOrder.created_at).add(5, 'day').toISOString()),
                )).execute();
                // Create a map for O(1) lookup instead of using find()
                const orderTransactionsMap = new Map(
                    orderTransactions.map(transaction => [transaction.order_id, transaction.amount])
                );

                // Update rolesList more efficiently
                rolesList = rolesList.map((order) => ({
                    ...order,
                    bonus: orderTransactionsMap.get(order.id) || 0
                }));
            }


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
                ext_all: t.Optional(t.Nullable(t.String())),
            }),
        }
    )
    .get('/api/orders/my_orders', async ({ cacheControl, user, drizzle }) => {

        if (!user?.user.id) {
            return [];
        }

        const usersTerminals = await drizzle.select({
            terminal_id: users_terminals.terminal_id
        })
            .from(users_terminals)
            .where(
                eq(users_terminals.user_id, user?.user.id)
            )
            .execute();
        const terminalIds = usersTerminals.map((terminal) => terminal.terminal_id);
        const allTerminals = await cacheControl.getTerminals();
        const terminalsList = allTerminals.filter((terminal) => terminalIds.includes(terminal.id));
        const terminalsOrganizations = terminalsList.map((terminal) => terminal.organization_id);

        const orderStatuses = await cacheControl.getOrderStatuses();
        const organizationsOrderStatuses = orderStatuses.filter(
            (orderStatus) =>
                terminalsOrganizations.includes(orderStatus.organization_id) && !orderStatus.finish && !orderStatus.cancel,
        );
        const orderStatusIds = organizationsOrderStatuses.map((orderStatus) => orderStatus.id);

        const ordersList = await drizzle.select({
            id: orders.id,
            order_number: orders.order_number,
            organization_id: orders.organization_id,
            orders_organization: {
                id: organization.id,
                name: organization.name,
                icon_url: organization.icon_url,
                active: organization.active,
                external_id: organization.external_id,
                support_chat_url: organization.support_chat_url,
            },
            orders_customers: {
                id: customers.id,
                name: customers.name,
                phone: customers.phone,
            },
            orders_order_status: {
                id: order_status.id,
                name: order_status.name,
                finish: order_status.finish,
                cancel: order_status.cancel,
                on_way: order_status.on_way,
                in_terminal: order_status.in_terminal,
            },
            orders_terminals: {
                id: terminals.id,
                name: terminals.name,
            },
            created_at: orders.created_at,
            to_lat: orders.to_lat,
            to_lon: orders.to_lon,
            from_lat: orders.from_lat,
            from_lon: orders.from_lon,
            pre_distance: orders.pre_distance,
            delivery_comment: orders.delivery_comment,
            delivery_address: orders.delivery_address,
            delivery_price: orders.delivery_price,
            order_price: orders.order_price,
            courier_id: orders.courier_id,
            payment_type: orders.payment_type,
            customer_delivery_price: orders.customer_delivery_price,
            additional_phone: orders.additional_phone,
            house: orders.house,
            entrance: orders.entrance,
            flat: orders.flat,
        })
            .from(orders)
            .leftJoin(organization, eq(orders.organization_id, organization.id))
            .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
            .leftJoin(customers, eq(orders.customer_id, customers.id))
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(and(
                inArray(orders.order_status_id, orderStatusIds),
                eq(orders.courier_id, user?.user.id),
                gte(orders.created_at, dayjs().subtract(4, 'days').format('YYYY-MM-DD HH:mm:ss')),
                lte(orders.created_at, dayjs().add(2, 'days').format('YYYY-MM-DD HH:mm:ss')),
            ))
            .orderBy(asc(orders.created_at)).execute();
        return await prepareOrdersNextButton(ordersList.map((order) => {
            if (order.orders_organization && order.orders_organization.icon_url) {
                order.orders_organization.icon_url = order.orders_organization.icon_url.replace('model_uploads', 'public/model_uploads');
            }
            return order;
        }), cacheControl);
    }, {
        permission: 'orders.list',
    })
    .get('/api/orders/my_new_orders', async ({ user, cacheControl, drizzle }) => {
        if (!user?.user.is_online) {
            return [];
        }

        const usersTerminalsListPrepare = await drizzle
            .select({
                terminal_id: users_terminals.terminal_id
            })
            .from(users_terminals)
            .where(
                eq(users_terminals.user_id, sql.placeholder('user_id'))
            ).prepare('usersTerminalsList');
        const usersTerminalsList = await usersTerminalsListPrepare.execute({ user_id: user?.user.id });
        const orderStatuses = await cacheControl.getOrderStatuses();

        const newOrderStatuses = orderStatuses.filter((orderStatus) => orderStatus.sort === 1);

        const terminalsIds = usersTerminalsList.map((terminal) => terminal.terminal_id);
        const cacheTerminals = await cacheControl.getTerminals();
        const filteredTerminalIs = cacheTerminals.filter((terminal) => terminalsIds.includes(terminal.id));
        const terminalsOrganizations = filteredTerminalIs.map((terminal) => terminal.organization_id);

        const cacheOrganizations = await cacheControl.getOrganizations();

        const organizations = cacheOrganizations.filter((organization) => terminalsOrganizations.includes(organization.id));

        const userMaxActiveOrderCountPrepare = await drizzle
            .select({
                max_active_order_count: users.max_active_order_count,
            })
            .from(users)
            .where(
                eq(users.id, sql.placeholder('user_id'))
            ).prepare('userMaxActiveOrderCount');
        const userAdditionalData = await userMaxActiveOrderCountPrepare.execute({ user_id: user?.user.id });

        let maxActiveOrderCount = 0;

        if (userAdditionalData.length > 0 && userAdditionalData[0].max_active_order_count) {
            maxActiveOrderCount = userAdditionalData[0].max_active_order_count!;
        } else {
            // get maximum max_active_order_count from organizations
            maxActiveOrderCount = Math.max(...organizations.map((organization) => organization.max_active_order_count));
        }

        const fromDate = dayjs().subtract(2, 'days').toISOString();
        const toDate = dayjs().add(2, 'days').toISOString();

        const currentOrdersCount = await drizzle
            .select({
                count: sql<number>`count(*)`
            }).from(orders).where(and(
                inArray(orders.terminal_id, terminalsIds),
                inArray(orders.order_status_id, orderStatuses.filter(orderStatus => !orderStatus.finish && !orderStatus.cancel).map((orderStatus) => orderStatus.id)),
                eq(orders.courier_id, user?.user.id),
                gte(orders.created_at, fromDate),
                lte(orders.created_at, toDate),
            )).execute();

        let possibleOrdersCount = maxActiveOrderCount - currentOrdersCount[0].count;


        const ordersList = await drizzle.select({
            id: orders.id,
            order_number: orders.order_number,
            organization_id: orders.organization_id,
            orders_organization: {
                id: organization.id,
                name: organization.name,
                icon_url: organization.icon_url,
                active: organization.active,
                external_id: organization.external_id,
                support_chat_url: organization.support_chat_url,
            },
            orders_customers: {
                id: customers.id,
                name: customers.name,
                phone: customers.phone,
            },
            orders_order_status: {
                id: order_status.id,
                name: order_status.name,
                finish: order_status.finish,
                cancel: order_status.cancel,
                on_way: order_status.on_way,
                in_terminal: order_status.in_terminal,
            },
            orders_terminals: {
                id: terminals.id,
                name: terminals.name,
            },
            created_at: orders.created_at,
            to_lat: orders.to_lat,
            to_lon: orders.to_lon,
            from_lat: orders.from_lat,
            from_lon: orders.from_lon,
            pre_distance: orders.pre_distance,
            delivery_comment: orders.delivery_comment,
            delivery_address: orders.delivery_address,
            delivery_price: orders.delivery_price,
            order_price: orders.order_price,
            courier_id: orders.courier_id,
            payment_type: orders.payment_type,
            customer_delivery_price: orders.customer_delivery_price,
            additional_phone: orders.additional_phone,
            house: orders.house,
            entrance: orders.entrance,
            flat: orders.flat,
        })
            .from(orders)
            .leftJoin(organization, eq(orders.organization_id, organization.id))
            .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
            .leftJoin(customers, eq(orders.customer_id, customers.id))
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(and(
                inArray(orders.terminal_id, terminalsIds),
                inArray(orders.order_status_id, newOrderStatuses.map((orderStatus) => orderStatus.id)),
                gte(orders.created_at, fromDate),
                lte(orders.created_at, toDate),
            ))
            .orderBy(asc(orders.created_at))
            .limit(100)
            .execute();

        return ordersList.map((order) => {
            if (order.orders_organization && order.orders_organization.icon_url) {
                order.orders_organization.icon_url = order.orders_organization.icon_url.replace('model_uploads', 'public/model_uploads');
            }
            return order;
        });
    }, {
        permission: 'orders.list',
    })
    .get('/api/orders/list_in_map', async ({ drizzle, query, cacheControl, user }) => {
        const { terminal_id } = query;

        const orderStatuses = await cacheControl.getOrderStatuses();
        const orderStatusIds = orderStatuses.filter(orderStatus => !orderStatus.finish && !orderStatus.cancel).map((orderStatus) => orderStatus.id);

        const whereClause = [
            terminal_id ? inArray(orders.terminal_id, terminal_id.split(',')) : undefined,
            gte(orders.created_at, dayjs().subtract(2, 'days').toISOString()),
            lte(orders.created_at, dayjs().add(2, 'days').toISOString()),
            inArray(orders.order_status_id, orderStatusIds),
            eq(terminals.region, 'capital'),
            eq(terminals.active, true),
        ];

        if (user?.terminals && user.terminals.length > 0) {
            whereClause.push(
                inArray(orders.terminal_id, user.terminals)
            )
        }

        const ordersList = await drizzle.select({
            id: orders.id,
            order_number: orders.order_number,
            to_lat: orders.to_lat,
            to_lon: orders.to_lon,
            created_at: orders.created_at,
            courier_id: orders.courier_id,
            terminal_id: orders.terminal_id,
        })
            .from(orders)
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(
                and(...whereClause)
            )
            .execute();
        return ordersList;
    }, {
        permission: 'orders.list',
        query: t.Object({
            terminal_id: t.Optional(t.String()),
        })
    })
    .get('/api/orders/filtered_list_in_map', async ({ drizzle, query, cacheControl, user }) => {
        const { terminal_id, from_date, to_date } = query;

        const whereClause = [
            terminal_id ? inArray(orders.terminal_id, terminal_id.split(',')) : undefined,
            gte(orders.created_at, dayjs(from_date).toISOString()),
            lte(orders.created_at, dayjs(to_date).add(1, 'days').toISOString()),
            eq(terminals.region, 'capital'),
            eq(terminals.active, true),
        ];

        if (user?.terminals && user.terminals.length > 0) {
            whereClause.push(
                inArray(orders.terminal_id, user.terminals)
            )
        }

        const ordersList = await drizzle.select({
            id: orders.id,
            order_number: orders.order_number,
            to_lat: orders.to_lat,
            to_lon: orders.to_lon,
            created_at: orders.created_at,
            courier_id: orders.courier_id,
            terminal_id: orders.terminal_id,
        })
            .from(orders)
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(
                and(
                    ...whereClause
                )
            )
            .execute();
        return ordersList;
    }, {
        permission: 'orders.list',
        query: t.Object({
            terminal_id: t.Optional(t.String()),
            from_date: t.String(),
            to_date: t.String(),
        })
    })
    .post('/api/orders/approve', async ({
        body: { order_id, latitude, longitude },
        user,
        set,
        cacheControl,
        drizzle,
        redis,
        queues: {
            processOrderChangeCourierQueue,
            processSetQueueLastCourier,
        }
    }) => {

        if (!user?.user.id) {
            return [];
        }

        const fromDate = dayjs().subtract(2, 'days').format('YYYY-MM-DD HH:mm:ss');
        const toDate = dayjs().add(2, 'days').format('YYYY-MM-DD HH:mm:ss');
        const existingOrder = await drizzle
            .select({
                id: orders.id,
                organization_id: orders.organization_id,
                courier_id: orders.courier_id,
                order_status_id: orders.order_status_id,
                orders_terminals: {
                    id: terminals.id,
                    latitude: terminals.latitude,
                    longitude: terminals.longitude,
                },
            })
            .from(orders)
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(
                and(
                    eq(orders.id, order_id),
                    gte(orders.created_at, fromDate),
                    lte(orders.created_at, toDate),
                )
            )
            .execute();
        if (existingOrder.length === 0) {
            set.status = 400;
            return {
                message: "Order not found",
            };
        }

        const order = existingOrder[0];

        if (order.courier_id) {
            set.status = 400;
            return {
                message: "Order already approved",
            };
        }

        const organization = await cacheControl.getOrganization(order.organization_id);
        const distance = getDistance(
            { latitude: order.orders_terminals!.latitude, longitude: order.orders_terminals!.longitude },
            { latitude, longitude },
        );
        if (distance > organization.max_distance) {
            set.status = 400;
            return {
                message: "You are too far from terminal",
            };
        }
        const usersTerminalsList = await drizzle.select({
            terminal_id: users_terminals.terminal_id
        }).from(users_terminals).where(eq(users_terminals.user_id, user?.user.id)).execute();
        const orderStatuses = await cacheControl.getOrderStatuses();

        const newOrderStatuses = orderStatuses.filter((orderStatus) => orderStatus.sort === 1);

        const terminalsIds = usersTerminalsList.map((terminal) => terminal.terminal_id);
        const cacheTerminals = await cacheControl.getTerminals();
        const filteredTerminalIs = cacheTerminals.filter((terminal) => terminalsIds.includes(terminal.id));
        const terminalsOrganizations = filteredTerminalIs.map((terminal) => terminal.organization_id);

        const cacheOrganizations = await cacheControl.getOrganizations();

        const organizations = cacheOrganizations.filter((organization) => terminalsOrganizations.includes(organization.id));
        const userAdditionalData = await drizzle.select({
            max_active_order_count: users.max_active_order_count,
        }).from(users).where(eq(users.id, user?.user.id)).execute();

        let maxActiveOrderCount = 0;

        if (userAdditionalData.length > 0 && userAdditionalData[0].max_active_order_count) {
            maxActiveOrderCount = userAdditionalData[0].max_active_order_count!;
        } else {
            // get maximum max_active_order_count from organizations
            maxActiveOrderCount = Math.max(...organizations.map((organization) => organization.max_active_order_count));
        }

        const currentOrdersCount = await drizzle.select({
            count: sql<number>`count(*)`
        }).from(orders).where(and(
            inArray(orders.terminal_id, terminalsIds),
            inArray(orders.order_status_id, orderStatuses.filter(orderStatus => !orderStatus.finish && !orderStatus.cancel).map((orderStatus) => orderStatus.id)),
            eq(orders.courier_id, user?.user.id),
            gte(orders.created_at, fromDate),
            lte(orders.created_at, toDate),
        )).execute();

        let possibleOrdersCount = maxActiveOrderCount - currentOrdersCount[0].count;

        if (possibleOrdersCount <= 0) {
            set.status = 400;
            return {
                message: "You can't take more orders",
            };
        }

        const organizationStatuses = orderStatuses.filter((orderStatus) => orderStatus.organization_id === order.organization_id);
        const sortedOrderStatuses = sort(organizationStatuses, (i) => +i.sort);

        const currentStatusIndex = sortedOrderStatuses.findIndex((orderStatus) => orderStatus.id === order.order_status_id);

        const nextStatus = sortedOrderStatuses[currentStatusIndex + 1];
        await drizzle.update(orders).set({
            courier_id: user?.user.id,
            order_status_id: nextStatus.id,
        }).where(eq(orders.id, order_id)).execute();

        await processOrderChangeCourierQueue.add(order.id, {
            order_id: order_id,
            before_courier_id: order.courier_id,
            after_courier_id: user?.user.id,
            user_id: user?.user.id,
        }, {
            attempts: 3, removeOnComplete: true
        });

        const settingsWorkStartTime = getHours(
            await getSetting(redis, "work_start_time")
        );
        const settingsWorkEndTime = getHours(
            await getSetting(redis, "work_end_time")
        );

        await processSetQueueLastCourier.add(order.id, {
            courier_id: user?.user.id,
            terminal_id: order.orders_terminals!.id,
            workStartTime: settingsWorkStartTime,
            workEndTime: settingsWorkEndTime,
        }, {
            attempts: 3, removeOnComplete: true
        });
        return order;
    }, {
        permission: 'orders.list',
        body: t.Object({
            order_id: t.String(),
            latitude: t.Numeric(),
            longitude: t.Numeric(),
        })
    })
    .post('/api/orders/set_status', async ({ body: { order_id, status_id, latitude, longitude }, user, set, cacheControl, drizzle,
    queues: {
        processOrderEcommerceWebhookQueue,
        processOrderCompleteQueue,
        processOrderChangeStatusQueue
    } }) => {

        const fromDate = dayjs().subtract(4, 'days').format('YYYY-MM-DD HH:mm:ss');
        const toDate = dayjs().add(2, 'days').format('YYYY-MM-DD HH:mm:ss');

        const existingOrderPrepare = drizzle
            .select({
                id: orders.id,
                organization_id: orders.organization_id,
                courier_id: orders.courier_id,
                order_status_id: orders.order_status_id,
                terminal_id: orders.terminal_id,
                to_lat: orders.to_lat,
                to_lon: orders.to_lon,
                created_at: orders.created_at,
            })
            .from(orders)
            .where(
                and(
                    eq(orders.id, sql.placeholder('order_id')),
                    gte(orders.created_at, sql.placeholder('fromDate')),
                    lte(orders.created_at, sql.placeholder('toDate')),
                )
            )
            .prepare('setStatusExistingOrder');

        const existingOrder = await existingOrderPrepare.execute({
            order_id,
            fromDate,
            toDate,
        });

        if (existingOrder.length === 0) {
            set.status = 400;
            return {
                message: "Order not found",
            };
        }

        const order = existingOrder[0];

        if (order.courier_id !== user?.user.id) {
            set.status = 400;
            return {
                message: "It's not your order",
            };
        }


        const ordersStatuses = await cacheControl.getOrderStatuses();
        const currentStatus = ordersStatuses.find((orderStatus) => orderStatus.id === status_id);

        const terminalsList = await cacheControl.getTerminals();
        const currentTerminal = terminalsList.find((terminal) => terminal.id === order.terminal_id);
        if (currentStatus?.in_terminal) {
            if (!latitude) {
                set.status = 400;
                return {
                    message: "Latitude is required",
                };
            }


            const organization = await cacheControl.getOrganization(order.organization_id);
            const distance = getDistance(
                { latitude: currentTerminal!.latitude, longitude: currentTerminal!.longitude },
                { latitude: latitude!, longitude: longitude! },
            );
            if (distance > organization.max_distance) {
                set.status = 400;
                return {
                    message: "You are too far from terminal",
                };
            }
        }
        if (currentStatus?.waiting || currentStatus?.finish) {
            if (!latitude) {
                set.status = 400;
                return {
                    message: "Latitude is required",
                };
            }
            if (!currentTerminal?.allow_close_anywhere) {
                const organization = await cacheControl.getOrganization(order.organization_id);
                const distance = getDistance(
                    { latitude: order.to_lat, longitude: order.to_lon },
                    { latitude: latitude!, longitude: longitude! },
                );
                if (distance > organization.max_order_close_distance) {
                    set.status = 400;
                    return {
                        message: "You are too far from order",
                    };
                }
            }
        }

        if (currentStatus?.finish || currentStatus?.cancel) {
            const updateOrderStatusFinish = drizzle.update(orders).set({
                order_status_id: status_id,
                finished_date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            })
                .where(
                    and(
                        eq(orders.id, order_id),
                        gte(orders.created_at, fromDate),
                        lte(orders.created_at, toDate)
                    )
                )
                .execute();
        } else {

            const updateOrderPrepare = drizzle.update(orders).set({
                order_status_id: status_id,
            })
                .where(
                    and(
                        eq(orders.id, order_id),
                        gte(orders.created_at, fromDate),
                        lte(orders.created_at, toDate)
                    )
                )
                .execute();

        }
        const lastOrderActionsPrepapre = drizzle
            .select({
                id: order_actions.id,
                created_at: order_actions.created_at,
                order_created_at: order_actions.order_created_at,
            })
            .from(order_actions)
            .where(
                and(
                    eq(order_actions.order_id, sql.placeholder('order_id')),
                    gte(order_actions.order_created_at, sql.placeholder('fromDate')),
                    lte(order_actions.order_created_at, sql.placeholder('toDate')),
                    eq(order_actions.action, 'STATUS_CHANGE')
                )
            )
            .orderBy(desc(order_actions.created_at))
            .limit(1)
            .prepare('setStatusLastOrderActions');
        const lastOrderActions = await lastOrderActionsPrepapre.execute({
            order_id,
            fromDate,
            toDate,
        });
        let duration = 0;

        if (lastOrderActions.length > 0) {
            duration = dayjs().diff(lastOrderActions[0].created_at, 'second');
        }
        await drizzle.insert(order_actions).values({
            terminal_id: order.terminal_id,
            order_id,
            action: 'STATUS_CHANGE',
            order_created_at: order.created_at,
            duration,
            created_by: user?.user.id,
            action_text: `Статус заказа изменен на "${currentStatus!.name}"`,
        }).execute();
        const ordersListPrepare = drizzle
            .select({
                id: orders.id,
                order_number: orders.order_number,
                organization_id: orders.organization_id,
                terminal_id: orders.terminal_id,
                delivery_pricing_id: orders.delivery_pricing_id,
                orders_organization: {
                    id: organization.id,
                    name: organization.name,
                    icon_url: organization.icon_url,
                    active: organization.active,
                    external_id: organization.external_id,
                    support_chat_url: organization.support_chat_url,
                },
                orders_customers: {
                    id: customers.id,
                    name: customers.name,
                    phone: customers.phone,
                },
                orders_order_status: {
                    id: order_status.id,
                    name: order_status.name,
                    finish: order_status.finish,
                    cancel: order_status.cancel,
                    on_way: order_status.on_way,
                    in_terminal: order_status.in_terminal,
                },
                orders_terminals: {
                    id: terminals.id,
                    name: terminals.name,
                },
                created_at: orders.created_at,
                to_lat: orders.to_lat,
                to_lon: orders.to_lon,
                from_lat: orders.from_lat,
                from_lon: orders.from_lon,
                pre_distance: orders.pre_distance,
                delivery_comment: orders.delivery_comment,
                delivery_address: orders.delivery_address,
                delivery_price: orders.delivery_price,
                order_price: orders.order_price,
                courier_id: orders.courier_id,
                payment_type: orders.payment_type,
                customer_delivery_price: orders.customer_delivery_price,
                additional_phone: orders.additional_phone,
                house: orders.house,
                entrance: orders.entrance,
                flat: orders.flat,
            })
            .from(orders)
            .leftJoin(organization, eq(orders.organization_id, organization.id))
            .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
            .leftJoin(customers, eq(orders.customer_id, customers.id))
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(and(
                eq(orders.id, sql.placeholder('order_id')),
                gte(orders.created_at, sql.placeholder('fromDate')),
                lte(orders.created_at, sql.placeholder('toDate')),
            ))
            .limit(1)
            .orderBy(asc(orders.created_at))
            .prepare('setStatusOrdersList');

        const ordersList = await ordersListPrepare.execute({
            order_id,
            fromDate,
            toDate,
        });

        const result = await prepareOrdersNextButton(ordersList.map((order) => {
            if (order.orders_organization && order.orders_organization.icon_url) {
                order.orders_organization.icon_url = order.orders_organization.icon_url.replace('model_uploads', 'public/model_uploads');
            }
            return order;
        }), cacheControl);

        if (currentStatus?.finish) {

            await processOrderCompleteQueue.add(result[0].id, result[0], {
                attempts: 3, removeOnComplete: true
            });
        }

        await processOrderChangeStatusQueue.add(result[0].id, {
            order_id: result[0].id,
            before_status_id: result[0].order_status_id,
            after_status_id: status_id,
            user_id: user?.user.id,
        }, {
            attempts: 3, removeOnComplete: true
        });

        await processOrderEcommerceWebhookQueue.add(result[0].id, result[0], {
            attempts: 3, removeOnComplete: true
        });

        return result[0];
    }, {
        permission: 'orders.list',
        body: t.Object({
            order_id: t.String(),
            status_id: t.String(),
            latitude: t.Optional(t.Nullable(t.Numeric())),
            longitude: t.Optional(t.Nullable(t.Numeric())),
        })
    })
    .post('/api/orders/external', async ({
        body: {
            terminal_id,
            order_number,
            customerName,
            customerPhone,
            toLat,
            toLon,
            address,
            price: order_price,
            comment,
            payment_method,
            delivery_schedule,
            later_time,
            additionalPhone,
            house,
            entrance,
            flat,
            orderItems,
            source_type,
        },
        cacheControl,
        redis,
        request: {
            headers
        },
        drizzle,
        set,
        queues: {
            newOrderNotify,
            processTryAssignCourier
        }
    }) => {
        const token = headers.get("authorization")?.split(" ")[1] ?? null;

        const apiTokenJson = await redis.get(
            `${process.env.PROJECT_PREFIX}_api_tokens`
        );
        try {
            const apiTokens = JSON.parse(apiTokenJson || "[]");
            const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
            if (!apiToken) {
                set.status = 403;

                return { error: `Forbidden` };
            } else {
                const organizations = await cacheControl.getOrganizations();
                const currentOrganization = organizations.find((org: any) => org.id === apiToken.organization_id);
                if (currentOrganization) {
                    const searchOrder = await drizzle.select({
                        id: orders.id,
                    }).from(orders).where(and(
                        eq(orders.order_number, order_number.toString()),
                        eq(orders.organization_id, currentOrganization.id),
                        gte(orders.created_at, dayjs().startOf('month').format('YYYY-MM-DD HH:mm:ss')),
                        lte(orders.created_at, dayjs().endOf('month').format('YYYY-MM-DD HH:mm:ss')),
                    )).limit(1).execute();

                    if (searchOrder && searchOrder.length > 0) {
                        set.status = 409;
                        return { error: `Order already exists` };
                    }

                    const terminals = await cacheControl.getTerminals();
                    const currentTerminal = terminals.find((terminal: any) => terminal.external_id
                        === terminal_id);

                    if (!currentTerminal) {
                        set.status = 409;
                        return { error: `Terminal not found` };
                    }

                    const deliveryPricing = await cacheControl.getOrganizationDeliveryPricing(currentOrganization.id);

                    // find active delivery pricing for current time and day
                    const currentDay = new Date().getDay() == 0 ? 7 : new Date().getDay();
                    const currentTime = new Date().getHours();
                    const activeDeliveryPricing = deliveryPricing.filter((d) => {
                        let res = false;
                        const currentTime = new Date();
                        const now = getMinutesNow();
                        let start = getMinutes(d.start_time);
                        let end = getMinutes(d.end_time);

                        if (end < start && now < start) {
                            start -= getMinutes('24:00');
                        } else if (start > end) end += getMinutes('24:00');
                        const fullYear = currentTime.getFullYear();
                        if (
                            d.days?.includes(currentDay.toString()) &&
                            now > start &&
                            now < end &&
                            !!d.active &&
                            typeof d.min_price != 'undefined' &&
                            d.min_price! <= order_price
                        ) {
                            if (d.terminal_id === null) {
                                res = true;
                                if (d.source_type && d.source_type.length > 0 && source_type && source_type.length > 0) {
                                    const sourceTypes = d.source_type.split(',').map((s) => s.trim());
                                    if (sourceTypes.includes(source_type)) {
                                        res = true;
                                    } else {
                                        res = false;
                                    }
                                }
                            } else if (d.terminal_id === currentTerminal.id) {
                                res = true;
                                if (d.source_type && d.source_type.length > 0 && source_type && source_type.length > 0) {
                                    const sourceTypes = d.source_type.split(',').map((s) => s.trim());
                                    if (sourceTypes.includes(source_type)) {
                                        res = true;
                                    } else {
                                        res = false;
                                    }
                                }
                            }
                        }
                        return res;
                    });

                    let activeDeliveryPricingSorted = sort(activeDeliveryPricing, (i) => +i.default);
                    activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.price_per_km);
                    activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => i.min_price ? +i.min_price! : 0, true);

                    const terminalDeliveryPricing = activeDeliveryPricing.filter((d) => d.terminal_id === currentTerminal.id);
                    let terminalDeliveryPricingSorted = sort(terminalDeliveryPricing, (i) => +i.default);
                    terminalDeliveryPricingSorted = sort(terminalDeliveryPricingSorted, (i) => +i.price_per_km);
                    terminalDeliveryPricingSorted = sort(terminalDeliveryPricingSorted, (i) => +i.min_price!, true);
                    // console.log('terminalDeliveryPricingSorted', terminalDeliveryPricingSorted);
                    const otherDeliveryPricing = activeDeliveryPricing.filter((d) => d.terminal_id !== currentTerminal.id);
                    let otherDeliveryPricingSorted = sort(otherDeliveryPricing, (i) => +i.default);
                    otherDeliveryPricingSorted = sort(otherDeliveryPricingSorted, (i) => +i.price_per_km);
                    otherDeliveryPricingSorted = sort(otherDeliveryPricingSorted, (i) => +i.min_price!, true);
                    // console.log('otherDeliveryPricingSorted', otherDeliveryPricingSorted);
                    activeDeliveryPricingSorted = [...terminalDeliveryPricingSorted, ...otherDeliveryPricingSorted];
                    // console.log('activeDeliveryPricingSorted', activeDeliveryPricingSorted);

                    let minDistance = 0;
                    let minDuration = 0;
                    let minDeliveryPricing: InferSelectModel<typeof delivery_pricing> | null = null;

                    if (activeDeliveryPricingSorted.length == 0) {
                        set.status = 409;
                        return { error: `No active delivery pricing` };
                    }

                    const actualLat = toLat;
                    const actualLon = toLon;
                    for (const d of activeDeliveryPricingSorted) {
                        if (d.drive_type == 'foot') {
                            try {
                                const responseJson = await fetch(
                                    `http://127.0.0.1:5001/route/v1/driving/${currentTerminal.longitude},${currentTerminal.latitude};${actualLon},${actualLat}?steps=true&overview=false`
                                );
                                const data = await responseJson.json();
                                if (d.price_per_km == 0 && d.rules) {
                                    const rules = d.rules as DeliveryPricingRulesDto[];
                                    const maxDistance: any = max(rules, (i: any) => +i.to);
                                    const tempDistance = data.routes[0].distance + 100; // add 100 meters
                                    if (tempDistance / 1000 > maxDistance.to) {
                                        continue;
                                    } else {
                                        if (!minDeliveryPricing) {
                                            minDistance = tempDistance;
                                            minDuration = data.routes[0].duration;
                                            minDeliveryPricing = d;
                                        }
                                        if (tempDistance < minDistance) {
                                            minDistance = tempDistance;
                                            minDuration = data.routes[0].duration;
                                            minDeliveryPricing = d;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('foot error', e);
                            }
                        } else {
                            try {
                                const responseJson = await fetch(
                                    `http://127.0.0.1:5000/route/v1/driving/${currentTerminal.longitude},${currentTerminal.latitude};${actualLon},${actualLat}?steps=true&overview=false`
                                );
                                const data = await responseJson.json();
                                const tempDistance = data.routes[0].distance + 100; // add 100 meters
                                if (!minDeliveryPricing) {
                                    minDistance = tempDistance;
                                    minDuration = data.routes[0].duration;
                                    minDeliveryPricing = d;
                                }
                                if (tempDistance < minDistance && tempDistance > d.min_distance_km) {
                                    minDistance = tempDistance;
                                    minDuration = data.routes[0].duration;
                                    minDeliveryPricing = d;
                                }

                            } catch (e) {
                                console.log('car error', e);
                            }
                        }
                    }


                    let price = 0;
                    let customerPrice = 0;
                    minDistance = minDistance / 1000;
                    let distance = minDistance;
                    const minDeliveryPricingRules = minDeliveryPricing?.rules as DeliveryPricingRulesDto[] | undefined;
                    if (minDeliveryPricingRules) {
                        minDeliveryPricingRules.forEach((r: any) => {
                            const { from, to, price: rulePrice } = r;
                            if (distance >= 0) {
                                distance -= +to - +from;
                                price += +rulePrice;
                            }
                        });
                    }

                    if (distance > 0) {
                        let additional = 0;
                        const decimals = +(distance % 1).toFixed(3) * 1000;

                        if (decimals > 0 && decimals < 250) {
                            additional = 500;
                        } else if (decimals >= 250 && decimals < 500) {
                            additional = 1000;
                        } else if (decimals >= 500 && decimals < 1000) {
                            additional = 1500;
                        }
                        const pricePerKm = Math.floor(distance) * minDeliveryPricing!.price_per_km;
                        price += pricePerKm + additional;
                    }

                    distance = minDistance;
                    const minDeliveryPricingCustomerRules = minDeliveryPricing?.customer_rules as DeliveryPricingRulesDto[] | undefined;
                    if (minDeliveryPricingCustomerRules) {
                        minDeliveryPricingCustomerRules.forEach((r: any) => {
                            const { from, to, price: rulePrice } = r;
                            if (distance >= 0) {
                                distance -= +to - +from;
                                customerPrice += +rulePrice;
                            }
                        });
                    }

                    if (distance > 0) {
                        let additional = 0;
                        const decimals = +(distance % 1).toFixed(3) * 1000;

                        if (decimals > 0 && decimals < 250) {
                            additional = 500;
                        } else if (decimals >= 250 && decimals < 500) {
                            additional = 1000;
                        } else if (decimals >= 500 && decimals < 1000) {
                            additional = 1500;
                        }
                        const pricePerKm = Math.floor(distance) * minDeliveryPricing!.price_per_km;
                        customerPrice += pricePerKm + additional;
                    }

                    const orderStatuses = await cacheControl.getOrderStatuses();

                    let orderStatus: InferSelectModel<typeof order_status> | undefined;

                    orderStatus = orderStatuses.find((o) => o.sort === 1 && o.organization_id === currentOrganization.id);

                    let customer = await drizzle.query.customers.findFirst({
                        columns: {
                            id: true
                        },
                        where: eq(customers.phone, customerPhone),
                    });

                    if (!customer) {
                        customer = (await drizzle.insert(customers).values({
                            name: customerName,
                            phone: customerPhone,
                        }).returning({
                            id: customers.id,
                        }).execute())[0];
                    }

                    const newOrders = await drizzle.insert(orders).values({
                        order_number: order_number.toString(),
                        organization_id: currentOrganization.id,
                        terminal_id: currentTerminal.id,
                        delivery_pricing_id: minDeliveryPricing!.id,
                        order_price: order_price!,
                        delivery_price: price,
                        customer_delivery_price: customerPrice,
                        payment_type: payment_method,
                        order_status_id: orderStatus!.id,
                        customer_id: customer.id,
                        delivery_address: address,
                        delivery_comment: comment,
                        delivery_type: minDeliveryPricing!.drive_type,
                        additional_phone: additionalPhone,
                        house,
                        entrance,
                        flat,
                        from_lat: currentTerminal.latitude,
                        from_lon: currentTerminal.longitude,
                        pre_distance: minDistance,
                        pre_duration: Math.round(minDuration),
                        to_lat: actualLat,
                        to_lon: actualLon,
                        delivery_schedule: delivery_schedule || 'now',
                        later_time: later_time || null
                    }).returning({
                        id: orders.id,
                        created_at: orders.created_at,
                        order_number: orders.order_number,
                        order_status_id: orders.order_status_id,
                        terminal_id: orders.terminal_id,
                        organization_id: orders.organization_id,
                    }).execute();

                    const currentOrder = newOrders[0];

                    for (const item of orderItems) {
                        await drizzle.insert(order_items).values({
                            order_id: currentOrder.id,
                            order_created_at: currentOrder.created_at,
                            product_id: item.productId,
                            quantity: item.quantity,
                            name: item.name,
                            price: parseInt(item.price),
                        }).execute();
                    }


                    await newOrderNotify.add(currentOrder.id, currentOrder, {
                        attempts: 3, removeOnComplete: true
                    });

                    let courierAssignTime = await getSetting(redis, "courier_assign_time");

                    if (courierAssignTime && courierAssignTime > 0) {
                        await processTryAssignCourier.add(currentOrder.id, {
                            id: currentOrder.id,
                            created_at: currentOrder.created_at,
                            queue: 1
                        }, {
                            attempts: 3, removeOnComplete: true,
                            delay: 1000 * 60 * courierAssignTime
                        });
                    }

                    // if (['621c0913-93d0-4eeb-bf00-f0c6f578bcd1', '0ca018c8-22ff-40b4-bb0a-b4ba95068662'].includes(currentTerminal.id)) {
                    //     // Next and Eko and C5
                    //     await processFromBasketToCouriers.add(currentOrder.id, {
                    //         id: currentOrder.id
                    //     }, {
                    //         attempts: 3, removeOnComplete: true,
                    //         delay: 1000 * 60 * 5
                    //     });
                    // }

                    // let defaultYandexCreateDelay = 1000 * 60 * 15;

                    // if (currentTerminal.time_to_yandex > 0) {
                    //     defaultYandexCreateDelay = 1000 * 60 * +currentTerminal.time_to_yandex;
                    // }

                    // let yandexAllowedTerminals = ['96f31330-ed33-42fa-b84a-d28e595177b0', 'c61bc73d-6fd6-49e7-acb0-09cfc1863bad']; // Farxadskiy

                    // if (
                    //     yandexAllowedTerminals.includes(currentTerminal.id) &&
                    //     minDistance >= 2 &&
                    //     delivery_schedule != 'later'
                    // ) {
                    //     await processCheckAndSendYandex.add(
                    //         'checkAndSendYandex',
                    //         {
                    //             id: currentOrder.id,
                    //         },
                    //         {
                    //             attempts: 3,
                    //             removeOnComplete: true,
                    //             // delay to 15 minutes
                    //             delay: defaultYandexCreateDelay,
                    //         },
                    //     );
                    // }

                    // yandexAllowedTerminals = ['621c0913-93d0-4eeb-bf00-f0c6f578bcd1', '0ca018c8-22ff-40b4-bb0a-b4ba95068662']; // Next and eko

                    // if (yandexAllowedTerminals.includes(currentTerminal.id) && delivery_schedule != 'later') {
                    //     await processCheckAndSendYandex.add(
                    //         'checkAndSendYandex',
                    //         {
                    //             id: currentOrder.id,
                    //         },
                    //         {
                    //             attempts: 3,
                    //             removeOnComplete: true,
                    //             delay: 1000 * 60 * 6,
                    //         },
                    //     );
                    // }

                    // yandexAllowedTerminals = ['8338f048-4b2f-4863-ad26-7b439e255203']; // Algoritm

                    // if (yandexAllowedTerminals.includes(currentTerminal.id) && delivery_schedule != 'later') {
                    //     await processCheckAndSendYandex.add(
                    //         'checkAndSendYandex',
                    //         {
                    //             id: currentOrder.id,
                    //         },
                    //         {
                    //             attempts: 3,
                    //             removeOnComplete: true,
                    //             delay: 1000 * 60 * 5,
                    //         },
                    //     );
                    // }

                    // yandexAllowedTerminals = [
                    //     '621c0913-93d0-4eeb-bf00-f0c6f578bcd1',
                    //     '972b7402-345d-400e-9bf2-b77691b0fcd9',
                    //     '56fe54a9-ae37-49b7-8de7-62aadb2abd19',
                    //     '419b466b-a575-4e2f-b771-7206342bc242',
                    //     'f8bff3a8-651e-44dc-a774-90129a3487eb',
                    //     '0ca018c8-22ff-40b4-bb0a-b4ba95068662',
                    // ]; // Eko Park, C5 and Oybek

                    // if (
                    //     yandexAllowedTerminals.includes(currentTerminal.id) &&
                    //     minDistance >= 2 &&
                    //     delivery_schedule != 'later'
                    // ) {
                    //     await processCheckAndSendYandex.add(
                    //         'checkAndSendYandex',
                    //         {
                    //             id: currentOrder.id,
                    //         },
                    //         {
                    //             attempts: 3,
                    //             removeOnComplete: true,
                    //             // delay to 15 minutes
                    //             delay: defaultYandexCreateDelay,
                    //         },
                    //     );
                    // }

                    // yandexAllowedTerminals = ['36f7a844-8a72-40c2-a1c5-27dcdc8c2efd', 'afec8909-5e34-45c8-8185-297bde69f263']; // Yunusabad and Mega Planet

                    // if (yandexAllowedTerminals.includes(currentTerminal.id) && delivery_schedule != 'later') {
                    //     await processCheckAndSendYandex.add(
                    //         'checkAndSendYandex',
                    //         {
                    //             id: currentOrder.id,
                    //         },
                    //         {
                    //             attempts: 3,
                    //             removeOnComplete: true,
                    //             // delay to 15 minutes
                    //             delay: defaultYandexCreateDelay,
                    //         },
                    //     );
                    // }

                    return newOrders[0];
                }
            }
        } catch (e) {
            set.status = 403;
            console.log(e);
            return { error: `Forbidden` };
        }

    }, {
        body: t.Object({
            terminal_id: t.String(),
            order_number: t.Number(),
            customerName: t.String(),
            customerPhone: t.String(),
            toLat: t.Number(),
            toLon: t.Number(),
            address: t.String(),
            price: t.Number(),
            comment: t.String(),
            payment_method: t.String(),
            delivery_schedule: t.Optional(t.Nullable(t.String())),
            later_time: t.Optional(t.Nullable(t.String())),
            additionalPhone: t.Optional(t.Nullable(t.String())),
            house: t.Optional(t.Nullable(t.String())),
            entrance: t.Optional(t.Nullable(t.String())),
            flat: t.Optional(t.Nullable(t.String())),
            source_type: t.Optional(t.Nullable(t.String())),
            orderItems: t.Array(t.Object({
                productId: t.Number(),
                quantity: t.Number(),
                name: t.String(),
                price: t.String(),
            }))
        })
    })
    .post(
        "/api/orders/calculate_garant",
        async ({
            redis,
            body: {
                data: {
                    startDate,
                    endDate,
                    courierId,
                    filteredTerminalIds,
                    walletEndDate,
                },
            },
            drizzle,
            user,
            set
        }) => {
            const sqlStartDate = dayjs(startDate.split("T")[0])
                .add(1, "d")
                // .subtract(5, "hour")
                .hour(0)
                .minute(0)
                .second(0)
                .format("YYYY-MM-DD HH:mm:ss");
            let sqlEndDate = dayjs(endDate.split("T")[0])
                .add(1, "day")
                .hour(4)
                .minute(0)
                .second(0)
                .format("YYYY-MM-DD HH:mm:ss");

            const sqlWalletEndDate = walletEndDate
                ? dayjs(walletEndDate.split("T")[0])
                    .add(2, "day")
                    .toISOString()
                    .split("T")[0]
                : null;
            const sqlPrevStartDate = dayjs(sqlStartDate)
                .subtract(1, "month")
                .toISOString()
                .split("T")[0];
            const sqlPrevEndDate = dayjs(sqlEndDate)
                .subtract(1, "month")
                .toISOString()
                .split("T")[0];
            if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
                sqlEndDate = dayjs()
                    .hour(5)
                    .minute(0)
                    .second(0)
                    .toISOString()
                    .split("T")[0];
            }

            const drizzleSqlStartDate = sql.raw(sqlStartDate);
            const drizzleSqlEndDate = sql.raw(sqlEndDate);

            const res = await redis.get(
                `${process.env.PROJECT_PREFIX}_organizations`
            );
            let organizationsList = JSON.parse(res || "[]") as InferSelectModel<
                typeof organization
            >[];
            const terminalsRes = await redis.get(
                `${process.env.PROJECT_PREFIX}_terminals`
            );
            let terminalsList = JSON.parse(
                terminalsRes || "[]"
            ) as InferSelectModel<typeof terminals>[];

            const courierIdCondition = courierId
                ? sql`and o.courier_id in (${sql.raw(courierId.map((id) => `'${id}'`).join(","))})`
                : sql``;
            const sqlPrevStartDateTime = sql.raw(`${sqlPrevStartDate} 00:00:00`);
            const sqlPrevEndDateTime = sql.raw(`${sqlPrevEndDate} 04:00:00`);
            const prevMonthOrders = (await drizzle.execute<{
                courier_id: string;
                total_orders: number;
            }>(sql`select o.courier_id,
                                    count(o.courier_id) as total_orders
                             from orders o
                                      inner join order_status os on o.order_status_id = os.id and os.finish = true
                                      inner join users u on o.courier_id = u.id
                             where o.created_at >= '${sqlPrevStartDateTime}'
                               and o.created_at <= '${sqlPrevEndDateTime}'
                               and u.phone not in ('+998908251218', '+998908249891') ${courierIdCondition}
                             group by o.courier_id
                             order by o.courier_id;`)).rows;


            let query = (await drizzle.execute<GarantReportItem>(
                sql`select min(o.created_at)                                              as begin_date,
                                    max(o.created_at)                                              as last_order_date,
                                    sum(o.delivery_price)                                          as delivery_price,
                                    concat(u.first_name, ' ', u.last_name)                         as courier,
                                    count(o.id)                                                    as orders_count,
                                    AVG(EXTRACT(EPOCH FROM (o.finished_date - o.created_at)) / 60) as avg_delivery_time,
                                    array_agg(o.created_at)                                        as orders_dates,
                                    o.courier_id
                             from orders o
                                      left join order_status os on o.order_status_id = os.id
                                      left join users u on o.courier_id = u.id
                             where o.created_at >= '${drizzleSqlStartDate}'
                               and o.created_at <= '${drizzleSqlEndDate}'
                               and os.finish = true
                               and u.phone not in ('+998908251218', '+998908249891') ${courierIdCondition}
                             group by o.courier_id, u.first_name, u.last_name
                             order by courier;`
            )).rows;
            let bonusQuery = (await drizzle.execute<{
                total_amount: number;
                courier_id: string;
            }>(sql`select sum(amount) as total_amount, courier_id
                             from order_transactions
                             where status = 'success'
                               and transaction_type != 'order' and created_at >= '${drizzleSqlStartDate}' and created_at <= '${drizzleSqlEndDate}'
                             group by courier_id;`)).rows;


            const couriersByTerminalById: Record<
                string,
                {
                    id: string;
                    name: string;
                    children: ReportCouriersByTerminal[];
                }[]
            > = {};
            const couriersByTerminal = (await drizzle.execute<ReportCouriersByTerminal>(sql`select sum(o.delivery_price)                  as delivery_price,
                                    concat(u.first_name, ' ', u.last_name) as courier,
                                    o.courier_id,
                                    o.courier_id,
                                    o.organization_id,
                                    o.terminal_id
                             from orders o
                                      left join order_status os on o.order_status_id = os.id
                                      left join users u on o.courier_id = u.id
                             where o.created_at >= '${drizzleSqlStartDate}'
                               and o.created_at <= '${drizzleSqlEndDate}'
                               and os.finish = true ${courierIdCondition}
                             group by o.courier_id, o.terminal_id, o.organization_id, u.first_name, u.last_name
                             order by courier;`)).rows;

            couriersByTerminal.forEach((item) => {
                if (!couriersByTerminalById[item.courier_id]) {
                    couriersByTerminalById[item.courier_id] = [];
                    organizationsList.forEach((org) => {
                        couriersByTerminalById[item.courier_id].push({
                            id: org.id,
                            name: org.name,
                            children: [],
                        });
                    });
                }
                organizationsList.forEach((org) => {
                    if (org.id === item.organization_id) {
                        couriersByTerminalById[item.courier_id].forEach((orgItem) => {
                            if (orgItem.id === item.organization_id) {
                                const terminal = terminalsList.find(
                                    (terminal) => terminal.id === item.terminal_id
                                );
                                orgItem.children.push({
                                    ...item,
                                    terminal_name: terminal ? terminal.name : "",
                                });
                            }
                        });
                    }
                });
            });

            const prevMonthByCourier: {
                [key: string]: number;
            } = prevMonthOrders.reduce((acc: any, item) => {
                acc[item.courier_id] = item.total_orders;
                return acc;
            }, {});

            let courierIds = query
                .filter((item) => item.courier_id != null)
                .map((item) => item.courier_id) as string[];

            if (courierIds.length == 0) {
                return [];
            }

            let tempCouriers = await drizzle
                .select({
                    id: users.id,
                    status: users.status,
                    created_at: users.created_at,
                    drive_type: users.drive_type,
                    order_start_date: users.order_start_date,
                    users_terminals: {
                        name: terminals.name,
                    },
                })
                .from(users)
                .leftJoin(users_terminals, eq(users.id, users_terminals.user_id))
                .leftJoin(terminals, eq(users_terminals.terminal_id, terminals.id))
                .where(
                    courierIds.length > 0
                        ? sql.raw(
                            `users.id in (${courierIds.map((id) => `'${id}'`).join(",")})`
                        )
                        : sql.raw("false")
                )
                .execute();

            const couriersObject: {
                [key: string]: {
                    id: string;
                    status: string;
                    created_at: string;
                    drive_type: "bycicle" | "foot" | "bike" | "car" | null;
                    order_start_date: string | null;
                    users_terminals: {
                        terminals: {
                            name: string;
                        };
                    }[];
                };
            } = {};

            tempCouriers.forEach((item) => {
                if (!couriersObject[item.id]) {
                    couriersObject[item.id] = {
                        ...item,
                        users_terminals: [],
                    };
                }
                if (item.users_terminals) {
                    couriersObject[item.id].users_terminals.push({
                        terminals: {
                            name: item.users_terminals.name,
                        },
                    });
                }
            });

            const couriers = Object.values(couriersObject);

            const customDateCouriers: {
                courier_id: string;
                order_start_date: string | null;
            }[] = [];
            couriers.forEach((item) => {
                if (dayjs(item.order_start_date).isSame(dayjs(), "month")) {
                    customDateCouriers.push({
                        courier_id: item.id,
                        order_start_date: item.order_start_date,
                    });
                    delete couriersByTerminalById[item.id];
                }
            });
            query = query.filter(
                (item) =>
                    customDateCouriers.find((i) => i.courier_id === item.courier_id) ==
                    null
            );
            bonusQuery = bonusQuery.filter(
                (item) =>
                    customDateCouriers.find((i) => i.courier_id === item.courier_id) ==
                    null
            );

            if (customDateCouriers.length) {
                const customDateQueries: any[] = [];
                const transaction = customDateCouriers.forEach(async (item) => {
                    const customSqlStartDateTime = sql.raw(`${dayjs(item.order_start_date).format(
                        "YYYY-MM-DD"
                    )} 00:00:00`);
                    const customSqlEndDateTime = sql.raw(`${dayjs(sqlEndDate).format(
                        "YYYY-MM-DD"
                    )} 04:00:00`);
                    const customCouierId = sql.raw(item.courier_id);
                    const customDateQuery = (await drizzle.execute<GarantReportItem>(
                        sql`
                                SELECT MIN(o.created_at)                                                   AS begin_date,
                                       MAX(o.created_at)                                                   AS last_order_date,
                                       SUM(o.delivery_price)                                               AS delivery_price,
                                       CONCAT(u.first_name, ' ', u.last_name)                              AS courier,
                                       COUNT(o.id)                                                         AS orders_count,
                                       AVG(EXTRACT(EPOCH FROM (o.finished_date - o.created_at)) / 60) AS avg_delivery_time,
                                       array_agg(date_trunc('day', o.created_at))                          AS orders_dates,
                                       o.courier_id
                                FROM orders o
                                         LEFT JOIN order_status os ON o.order_status_id = os.id
                                         LEFT JOIN users u ON o.courier_id = u.id
                                WHERE o.created_at >= '${customSqlStartDateTime}'
                                  AND o.created_at <= '${customSqlEndDateTime}'
                                  AND os.finish = true
                                  AND o.courier_id = '${customCouierId}'
                                GROUP BY o.courier_id, u.first_name, u.last_name
                                ORDER BY courier;
                            `
                    )).rows;
                    
                    customDateQueries.push(customDateQuery[0]);
                });

                await Promise.all(customDateQueries);

                if (customDateQueries.length) {
                    customDateQueries.forEach((item) => {
                        query.push(...item);
                    });
                }

                // @ts-ignore
                const customTerminalQueries = [];
                const byTerminalTransaction = customDateCouriers.map(async (item) => {
                    const customSqlStartDateTime = sql.raw(`${dayjs(item.order_start_date).format(
                        "YYYY-MM-DD"
                    )} 00:00:00`);
                    const customSqlEndDateTime = sql.raw(`${dayjs(sqlEndDate).format(
                        "YYYY-MM-DD"
                    )} 04:00:00`);
                    const customCouierId = sql.raw(item.courier_id);
                    // @ts-ignore
                    const customDateQuery = await this.prismaService.$queryRawUnsafe<
                        GarantReportItem[]
                    >(
                        `
                                SELECT SUM(o.delivery_price)                  AS delivery_price,
                                       CONCAT(u.first_name, ' ', u.last_name) AS courier,
                                       o.courier_id,
                                       o.courier_id,
                                       o.organization_id,
                                       o.terminal_id
                                FROM orders o
                                         LEFT JOIN order_status os ON o.order_status_id = os.id
                                         LEFT JOIN users u ON o.courier_id = u.id
                                WHERE o.created_at >= '${customSqlStartDateTime}'
                                  AND o.created_at <= '${customSqlEndDateTime}'
                                  AND os.finish = true
                                  AND o.courier_id = '${customCouierId}'
                                GROUP BY o.courier_id, o.terminal_id, o.organization_id, u.first_name, u.last_name
                                ORDER BY courier;
                            `
                    );

                    customTerminalQueries.push(customDateQuery);
                });

                await Promise.all(byTerminalTransaction);

                if (customTerminalQueries.length) {
                    // customTerminalQueries.forEach((item) => {
                    //   query.push(...item);
                    // });

                    // @ts-ignore
                    customTerminalQueries.forEach((item) => {
                        if (!couriersByTerminalById[item.courier_id]) {
                            couriersByTerminalById[item.courier_id] = [];

                            // @ts-ignore
                            organizations.forEach((org) => {
                                couriersByTerminalById[item.courier_id].push({
                                    id: org.id,
                                    name: org.name,
                                    children: [],
                                });
                            });
                        }

                        // @ts-ignore
                        organizations.forEach((org) => {
                            if (org.id === item.organization_id) {
                                couriersByTerminalById[item.courier_id].forEach((orgItem) => {
                                    if (orgItem.id === item.organization_id) {
                                        // @ts-ignore
                                        const terminal = terminals.find(
                                            // @ts-ignore
                                            (terminal) => terminal.id === item.terminal_id
                                        );
                                        orgItem.children.push({
                                            ...item,
                                            terminal_name: terminal ? terminal.name : "",
                                        });
                                    }
                                });
                            }
                        });
                    });
                }

                if (customDateCouriers.length) {
                    // @ts-ignore
                    const customDateBonusQueries = [];
                    const bonusTransaction = customDateCouriers.map(async (item) => {
                        const customCourierId = sql.raw(item.courier_id);
                        // @ts-ignore
                        const customDateQuery = await this.prismaService.$queryRawUnsafe<
                            {
                                courier_id: string;
                                total_amount: number;
                            }[]
                        >(`select sum(amount) as total_amount, courier_id
                               from order_transactions
                               where status = 'success'
                                 and transaction_type != 'order' and created_at >= '${drizzleSqlStartDate}' and created_at <= '${drizzleSqlEndDate}' and courier_id = '${customCourierId}'
                               group by courier_id;`);

                        customDateBonusQueries.push(customDateQuery);
                    });

                    await Promise.all(bonusTransaction);

                    if (customDateBonusQueries.length) {
                        // @ts-ignore
                        customDateBonusQueries.forEach((item) => {
                            bonusQuery.push(...item);
                        });
                    }
                }
            }

            const bonusByCourier: {
                [key: string]: number;
            } = {};

            bonusQuery.forEach((item) => {
                if (!bonusByCourier[item.courier_id]) {
                    bonusByCourier[item.courier_id] = 0;
                }
                bonusByCourier[item.courier_id] += item.total_amount;
            });

            const couriersById: {
                [key: string]: {
                    id: string;
                    status: "inactive" | "blocked" | "active";
                    created_at: string;
                    drive_type: "bycicle" | "foot" | "bike" | "car" | null;
                    order_start_date: string | null;
                    users_terminals: {
                        terminals: {
                            name: string;
                        };
                    }[];
                };
            } = couriers.reduce((acc, item) => {
                // @ts-ignore
                acc[item.id] = item;
                return acc;
            }, {});
            let walletQuery: {
                total_amount: number;
                courier_id: string;
            }[] = [];
            // if (walletEndDate) {
            //     walletQuery = await drizzle.execute<{
            //         total_amount: number;
            //         courier_id: string;
            //     }>(
            //         sql.raw(`select sum(amount) as total_amount, courier_id
            //                      from order_transactions
            //                      where status = 'pending'
            //                        and created_at <= '${sqlWalletEndDate} 04:00:00'
            //                          ${courierId
            //                 ? `and courier_id in (${courierId
            //                     .map((id) => `'${id}'`)
            //                     .join(",")})`
            //                 : courierIds.length
            //                     ? `and courier_id in (${courierIds
            //                         .map((id) => `'${id}'`)
            //                         .join(",")})`
            //                     : ""
            //             }
            //                      group by courier_id`)
            //     );
            // }

            // get couriers terminalIds
            const terminalIds = await drizzle
                .select()
                .from(users_terminals)
                .where(inArray(users_terminals.user_id, courierIds))
                .execute();

            const terminalIdsByCourier: {
                [key: string]: string[];
            } = terminalIds.reduce((acc, item) => {
                // @ts-ignore
                if (!acc[item.user_id]) {
                    // @ts-ignore
                    acc[item.user_id] = [];
                }
                // @ts-ignore
                acc[item.user_id].push(item.terminal_id);
                return acc;
            }, {});

            if (filteredTerminalIds && filteredTerminalIds.length) {
                const filteredCourierIds = Object.keys(terminalIdsByCourier).filter(
                    (courierId) => {
                        const courierTerminalIds = terminalIdsByCourier[courierId];
                        return courierTerminalIds.some((terminalId) =>
                            filteredTerminalIds.includes(terminalId)
                        );
                    }
                );
                // @ts-ignore
                query = query.filter((item) =>
                    filteredCourierIds.includes(item.courier_id)
                );
                courierIds = courierIds.filter((id) =>
                    filteredCourierIds.includes(id)
                );
            }

            let workStartHour = await getSetting(redis, "work_start_time");
            workStartHour = new Date(workStartHour).getHours();

            const courierSqlMap = sql.raw(courierIds.map((id) => `'${id}'`).join(","));
            const balanceQuery = (await drizzle.execute<{
                courier_id: string;
                balance: number;
            }>(sql`select courier_id, sum(amount) as balance
                             from order_transactions
                             where courier_id in (${courierSqlMap})
                               and status = 'pending'
                               and created_at >= '${drizzleSqlStartDate}'
                               and created_at <= '${drizzleSqlEndDate}'
                             group by courier_id`)).rows;



            const balanceById: {
                [key: string]: number;
            } = balanceQuery.reduce((acc: { [key: string]: number }, item) => {
                acc[item.courier_id] = item.balance;
                return acc;
            }, {});

            const result: GarantReportItem[] = [];

            let garantPricesJson = await getSetting(redis, "garant_prices");
            let garantPrices: {
                drive_type: string;
                price: number;
            }[] = [];
            let garantPrice = 5000000;
            let terminalCloseDays = await getSetting(redis, "terminal_close_days");
            try {
                garantPrices = JSON.parse(garantPricesJson || "[]");
            } catch (e) {
                console.log("can not calculate garant price", e);
            }
            try {
                terminalCloseDays = JSON.parse(terminalCloseDays);
                // group by terminal_id
                // @ts-ignore
                terminalCloseDays = terminalCloseDays.reduce((acc, item) => {
                    if (!acc[item.terminal_id]) {
                        acc[item.terminal_id] = [];
                    }
                    acc[item.terminal_id].push(dayjs(item.date.split("T")[0]));
                    return acc;
                }, {});
            } catch (e) {
                console.log("can not parse terminal close days", e);
            }

            query.forEach((item) => {
                if (!item.courier_id) {
                    return;
                }
                if (garantPrices) {
                    const garantPriceObject = garantPrices.find(
                        (priceItem) =>
                            priceItem.drive_type ===
                            couriersById[item.courier_id].drive_type
                    );
                    if (garantPriceObject) {
                        garantPrice = +garantPriceObject.price;
                    }
                }

                const resultItem = {
                    ...item,
                };
                resultItem.orders_count = Number(resultItem.orders_count);

                const timesByDate: {
                    [key: string]: Date;
                } = {};

                resultItem.orders_dates.forEach((date) => {
                    if (!timesByDate[dayjs(date).format("DDMMYYYY")]) {
                        timesByDate[dayjs(date).format("DDMMYYYY")] = date;
                    } else {
                        if (timesByDate[dayjs(date).format("DDMMYYYY")] < date) {
                            timesByDate[dayjs(date).format("DDMMYYYY")] = date;
                        }
                    }
                });
                resultItem.orders_dates = Object.values(timesByDate).sort(
                    (a, b) => new Date(a).getTime() - new Date(b).getTime()
                );
                let order_dates = [...resultItem.orders_dates];
                resultItem.delivery_price_orgs =
                    couriersByTerminalById[item.courier_id];
                resultItem.bonus_total = bonusByCourier[item.courier_id] || 0;

                resultItem.drive_type = couriersById[item.courier_id].drive_type!;
                if (
                    couriersById[item.courier_id].users_terminals &&
                    couriersById[item.courier_id].users_terminals.length
                ) {
                    if (couriersById[item.courier_id].users_terminals[0].terminals) {
                        resultItem.terminal_name =
                            couriersById[item.courier_id].users_terminals[0].terminals.name;
                    }
                }

                couriersById[item.courier_id].created_at = new Date(new Date(
                    couriersById[item.courier_id].created_at
                ).setHours(0, 0, 0, 0)).toISOString();
                resultItem.created_at = new Date(
                    couriersById[item.courier_id].created_at
                );
                if (dayjs(resultItem.last_order_date).isToday()) {
                    resultItem.last_order_date = dayjs(resultItem.last_order_date)
                        .add(-1, "d")
                        .toDate();
                }
                const userCreatedAtStart = dayjs(resultItem.created_at).format(
                    "YYYY-MM-DD"
                );
                const firstOrderDateStart = dayjs(resultItem.begin_date).format(
                    "YYYY-MM-DD"
                );
                const lastOrderDateStart = dayjs(resultItem.last_order_date).format(
                    "YYYY-MM-DD"
                );
                const isRegisteredThisMonth = dayjs(userCreatedAtStart).isBetween(
                    dayjs(firstOrderDateStart),
                    dayjs(lastOrderDateStart),
                    null,
                    "[]"
                );
                let actualDayOffs = 0;
                let possibleDayOffs = 4;

                /*if (isRegisteredThisMonth) {
              // difference between first day and start date in weeks using dayjs
              const weeks = dayjs(lastOrderDateStart).diff(dayjs(firstOrderDateStart), 'week');
              possibleDayOffs = weeks;
            } else */
                if (
                    dayjs(userCreatedAtStart).isBetween(
                        dayjs(sqlStartDate),
                        dayjs(sqlEndDate),
                        null,
                        "[]"
                    )
                ) {
                    const weeks = dayjs(lastOrderDateStart).diff(
                        dayjs(userCreatedAtStart),
                        "week"
                    );
                    possibleDayOffs = weeks;
                    if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
                        possibleDayOffs = dayjs(sqlEndDate).diff(
                            dayjs(userCreatedAtStart),
                            "week"
                        );
                    }
                }

                const datesBetween = [];
                let dayOffStartDate = [...order_dates][0];
                if (
                    resultItem.created_at &&
                    dayjs(resultItem.created_at).isBefore(dayjs(startDate))
                ) {
                    if (prevMonthByCourier[item.courier_id]) {
                        if (prevMonthByCourier[item.courier_id] > 0) {
                            dayOffStartDate = dayjs(startDate.split("T")[0])
                                .add(1, "d")
                                .toDate();
                        }
                    }
                }
                const date = dayOffStartDate;
                let currentDate = dayjs(sqlEndDate).toDate();
                // check if sqlStartDate is current month
                if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
                    currentDate = dayjs().add(-1, "d").toDate();
                }
                currentDate.setHours(0, 0, 0, 0);
                // date.setHours(0, 0, 0, 0);
                while (date < currentDate) {
                    datesBetween.push(dayjs(date).hour(0).minute(0).second(0));
                    date.setDate(date.getDate() + 1);
                }

                resultItem.actual_day_offs_list = [];

                datesBetween.forEach((date) => {
                    const orderDate = order_dates.find((d) => {
                        return (
                            dayjs(d).format("YYYY-MM-DD") === date.format("YYYY-MM-DD")
                        );
                    });
                    let isDayOff = false;
                    if (!orderDate) {
                        isDayOff = true;
                    }

                    if (isDayOff && terminalCloseDays) {
                        const courierTerminals = terminalIdsByCourier[item.courier_id];
                        if (courierTerminals) {
                            courierTerminals.forEach((terminal) => {
                                const terminalCloseDates = terminalCloseDays[terminal];
                                if (terminalCloseDates) {
                                    // @ts-ignore
                                    const isTerminalCloseDay = terminalCloseDates.find((d) =>
                                        dayjs(d).isSame(date)
                                    );
                                    if (isTerminalCloseDay) {
                                        isDayOff = false;
                                    }
                                }
                            });
                        }
                    }

                    if (isDayOff) {
                        actualDayOffs++;
                        resultItem.actual_day_offs_list.push(
                            date.tz("Asia/Tashkent").add(1, "day").toDate()
                        );
                    }
                });

                resultItem.formatted_avg_delivery_time = fancyTimeFormat(
                    +resultItem.avg_delivery_time
                );
                resultItem.actual_day_offs = actualDayOffs;

                let giveGarant = true;
                if (actualDayOffs > possibleDayOffs) {
                    giveGarant = false;
                }
                const order_dates_day: string[] = [];
                order_dates.forEach((date) => {
                    const dateObj = dayjs(date); //.add(5, 'hour');
                    const hour = dateObj.hour();
                    let dateString = dateObj.format("YYYY-MM-DD");
                    if (hour < workStartHour) {
                        dateString = dateObj.subtract(1, "day").format("YYYY-MM-DD");
                    }

                    if (!order_dates_day.includes(dateString)) {
                        order_dates_day.push(dateString);
                    }
                });
                resultItem.order_dates_count = order_dates_day.length;
                if (walletEndDate) {
                    resultItem.balance =
                        walletQuery.find(
                            (walletItem) => walletItem.courier_id === item.courier_id
                        )?.total_amount || 0;
                } else {
                    resultItem.balance = balanceById[item.courier_id]
                        ? +balanceById[item.courier_id]
                        : 0;
                }

                resultItem.earned =
                    +resultItem.delivery_price -
                    +resultItem.balance +
                    +resultItem.bonus_total;
                currentDate = dayjs(sqlEndDate).toDate();
                // check if sqlStartDate is current month
                if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
                    currentDate = dayjs().add(-1, "d").toDate();
                } else {
                    currentDate = dayjs(currentDate).add(-1, "d").toDate();
                }
                currentDate.setHours(0, 0, 0, 0);
                const daysInMonth = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    0
                ).getDate();
                const workDays =
                    dayjs(resultItem.last_order_date).diff(
                        dayjs(resultItem.begin_date),
                        "day"
                    ) + 1;
                resultItem.garant_days = resultItem.order_dates_count;
                if (giveGarant) {
                    resultItem.garant_price =
                        Math.round(
                            ((garantPrice / daysInMonth) * resultItem.garant_days) / 1000
                        ) * 1000;
                    resultItem.balance_to_pay =
                        Math.round(
                            (resultItem.garant_price -
                                resultItem.delivery_price -
                                resultItem.bonus_total) /
                            1000
                        ) * 1000;
                } else {
                    const possibleGarantPrice =
                        Math.round(((garantPrice / daysInMonth) * workDays) / 1000) *
                        1000;
                    resultItem.balance_to_pay = 0;
                    resultItem.possible_garant_price =
                        Math.round(
                            ((garantPrice / daysInMonth) * resultItem.orders_dates.length) /
                            1000
                        ) * 1000;
                    resultItem.possible_garant_price =
                        Math.round(
                            (possibleGarantPrice -
                                resultItem.delivery_price -
                                resultItem.bonus_total) /
                            1000
                        ) * 1000;
                }

                resultItem.possible_day_offs = possibleDayOffs;
                resultItem.status = couriersById[item.courier_id].status;
                result.push(resultItem);
            });
            return result;
        },
        {
            permission: 'orders.list',
            body: t.Object({
                data: t.Object({
                    startDate: t.String(),
                    endDate: t.String(),
                    courierId: t.Optional(t.Array(t.String())),
                    filteredTerminalIds: t.Optional(t.Array(t.String())),
                    walletEndDate: t.Optional(t.Nullable(t.String())),
                }),
            }),
        }
    )
    .post('/api/cancel_accept_order/:id', async ({ params: { id }, body: { queue }, drizzle, set, user, queues: {
        processTryAssignCourier
    } }) => {

        const order = await drizzle
            .select({
                id: orders.id,
                courier_id: orders.courier_id,
                created_at: orders.created_at,
            })
            .from(orders)
            .where(eq(orders.id, id))
            .execute();

        if (!order) {
            set.status = 404;
            return {
                message: "Order not found",
            };
        }

        await processTryAssignCourier.add(order[0].id, {
            order_id: order[0].id,
            created_at: order[0].created_at,
            queue: queue + 1,
            // @ts-ignore
            courier_id: user.user.id
        }, {
            attempts: 3, removeOnComplete: true
        });

    }, {
        permission: 'orders.list',
        params: t.Object({
            id: t.String(),
        }),
        body: t.Object({
            queue: t.Number(),
        }),
    })
    .get(
        "/api/orders/:id",
        async ({ params: { id }, query: { fields }, drizzle }) => {
            const couriers = alias(users, "couriers");
            let selectFields: SelectedFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, orders, {
                    organization,
                    order_status,
                    customers,
                    terminals,
                    couriers,
                });
            }
            const permissionsRecord = await drizzle
                .select(selectFields)
                .from(orders)
                .leftJoin(organization, eq(orders.organization_id, organization.id))
                .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                .leftJoin(customers, eq(orders.customer_id, customers.id))
                .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                .leftJoin(couriers, eq(orders.courier_id, couriers.id))
                .where(eq(orders.id, id))
                .execute() as OrdersWithRelations[];
            return {
                data: permissionsRecord[0],
            };
        },
        {
            permission: 'orders.show',
            params: t.Object({
                id: t.String(),
            }),
            query: t.Object({
                fields: t.Optional(t.String()),
            }),
        }
    )
    // .post(
    //     "/orders",
    //     async ({ body: { data, fields }, drizzle, user, set }) => {
    //         if (!user) {
    //             set.status = 401;
    //             return {
    //                 message: "User not found",
    //             };
    //         }

    //         if (!user.access.additionalPermissions.includes("orders.create")) {
    //             set.status = 401;
    //             return {
    //                 message: "You don't have permissions",
    //             };
    //         }
    //         let selectFields = {};
    //         if (fields) {
    //             selectFields = parseSelectFields(fields, orders, {});
    //         }
    //         const result = await drizzle
    //             .insert(orders)
    //             .values(data)
    //             .returning(selectFields);

    //         return {
    //             data: result[0],
    //         };
    //     },
    //     {
    //         body: t.Object({
    //             data: t.Object({
    //                 customer_id: t.String(),
    //                 courier_id: t.String(),
    //                 terminal_id: t.String(),
    //                 created_at: t.String(),
    //                 updated_at: t.String(),
    //             }),
    //             fields: t.Optional(t.Array(t.String())),
    //         }),
    //     }
    // )
    // .put(
    //     "/orders/:id",
    //     async ({ params: { id }, body: { data, fields }, drizzle, set, user }) => {
    //         if (!user) {
    //             set.status = 401;
    //             return {
    //                 message: "User not found",
    //             };
    //         }

    //         if (!user.access.additionalPermissions.includes("orders.edit")) {
    //             set.status = 401;
    //             return {
    //                 message: "You don't have permissions",
    //             };
    //         }
    //         let selectFields = {};
    //         if (fields) {
    //             selectFields = parseSelectFields(fields, orders, {});
    //         }
    //         const result = await drizzle
    //             .update(orders)
    //             .set(data)
    //             .where(eq(orders.id, id))
    //             .returning(selectFields);

    //         return {
    //             data: result[0],
    //         };
    //     },
    //     {
    //         params: t.Object({
    //             id: t.String(),
    //         }),
    //         body: t.Object({
    //             data: createInsertSchema(orders) as any,
    //             fields: t.Optional(t.Array(t.String())),
    //         }),
    //     }
    // )
    .post('/api/orders/:id/assign', async ({ params: { id }, body: { courier_id }, drizzle, set, user, queues: {
        processOrderChangeCourierQueue
    } }) => {

        const order = await drizzle
            .select({
                id: orders.id,
                courier_id: orders.courier_id,
            })
            .from(orders)
            .where(eq(orders.id, id))
            .execute();

        const result = await drizzle
            .update(orders)
            .set({
                courier_id
            })
            .where(eq(orders.id, id))
            .returning({
                id: orders.id,
                courier_id: orders.courier_id
            });

        await processOrderChangeCourierQueue.add(order[0].id, {
            order_id: id,
            before_courier_id: order[0].courier_id,
            after_courier_id: courier_id,
            // @ts-ignore
            user_id: user.user.id,
        }, {
            attempts: 3, removeOnComplete: true
        });

        return {
            data: result[0],
        };
    }, {
        permission: 'orders.edit',
        body: t.Object({
            courier_id: t.String(),
        }),
        params: t.Object({
            id: t.String(),
        }),
    })
    .post('/api/orders/:id/revoke', async ({ params: { id }, drizzle, set, user, queues: {
        processClearCourierQueue
    } }) => {

        const order = await drizzle
            .select({
                id: orders.id,
                courier_id: orders.courier_id,
            })
            .from(orders)
            .where(eq(orders.id, id))
            .execute();

        const result = await drizzle
            .update(orders)
            .set({
                courier_id: null
            })
            .where(eq(orders.id, id))
            .returning({
                id: orders.id,
                courier_id: orders.courier_id
            });

        await processClearCourierQueue.add(order[0].id, {
            order_id: id,
            courier_id: order[0].courier_id,
            // @ts-ignore
            user_id: user.user.id,
        }, {
            attempts: 3, removeOnComplete: true
        });

        return {
            data: result[0],
        };
    }, {
        permission: 'orders.edit',
        params: t.Object({
            id: t.String(),
        }),
    })
    .post('/api/orders/:id/set_status', async ({ params: { id }, body: { status_id, created_at }, drizzle, set, user, queues: {
        processOrderChangeStatusQueue
    } }) => {
        const order = await drizzle
            .select({
                id: orders.id,
                order_status_id: orders.order_status_id,
            })
            .from(orders)
            .where(and(
                eq(orders.id, id),
                gte(orders.created_at, dayjs(created_at).subtract(2, 'hours').format("YYYY-MM-DD HH:mm:ss")),
                lte(orders.created_at, dayjs(created_at).add(2, 'hours').format("YYYY-MM-DD HH:mm:ss"))
            ))
            .execute();

        const result = await drizzle
            .update(orders)
            .set({
                order_status_id: status_id
            })
            .where(eq(orders.id, id))
            .returning({
                id: orders.id,
                order_status_id: orders.order_status_id
            });

        await processOrderChangeStatusQueue.add(order[0].id, {
            order_id: id,
            before_status_id: order[0].order_status_id,
            after_status_id: status_id,
            // @ts-ignore
            user_id: user.user.id,
        }, {
            attempts: 3, removeOnComplete: true
        });

        return {
            data: result[0],
        };
    }, {
        permission: 'orders.edit',
        body: t.Object({
            status_id: t.String(),
            created_at: t.Optional(t.String()),
        }),
        params: t.Object({
            id: t.String(),
        }),
    })
    .get('/api/orders/:id/map_type', async ({
        params: { id },
        drizzle,
        set,
        user,
        cacheControl,
        query: {
            created_at
        }
    }) => {

        const orderPrepare = drizzle
            .select({
                id: orders.id,
                delivery_pricing_id: orders.delivery_pricing_id,
            })
            .from(orders)
            .where(
                and(
                    eq(orders.id, sql.placeholder('id')),
                    gte(orders.created_at, sql.placeholder('created_at_from')),
                    lte(orders.created_at, sql.placeholder('created_at_to'))
                )
            )
            .prepare('order_delivery_pricing_id_by_id')

        const order = await orderPrepare.execute({
            id,
            created_at_from: dayjs(created_at).subtract(2, 'hours').toISOString(),
            created_at_to: dayjs(created_at).add(2, 'hours').toISOString()
        });

        const deliveryPricing = await cacheControl.getDeliveryPricingById(order[0].delivery_pricing_id as string);

        return deliveryPricing.drive_type;
    }, {
        permission: 'orders.list',
        params: t.Object({
            id: t.String(),
        }),
        query: t.Object({
            created_at: t.String(),
        })
    })
    .get('/api/orders/:id/items', async ({ params: { id }, drizzle, set, user }) => {

        const items = await drizzle
            .select()
            .from(order_items)
            .where(eq(order_items.order_id, id))
            .execute() as InferSelectModel<typeof order_items>[];

        return items
    }, {
        permission: 'orders.list',
        params: t.Object({
            id: t.String(),
        }),
    })
    .get('/api/orders/:id/comments', async ({ params: { id }, drizzle, set, user }) => {


        const orderPrepare = drizzle
            .select({
                id: orders.id,
                delivery_comment: orders.delivery_comment,
                customer_id: orders.customer_id,
                created_at: orders.created_at,
            })
            .from(orders)
            .where(eq(orders.id, sql.placeholder('id')))
            .prepare('order_by_id_comments')

        const order = await orderPrepare.execute({
            id
        });
        if (!order) {
            set.status = 404;
            return {
                message: "Order not found",
            };
        }

        const customerCommentsPrepare = drizzle
            .select({
                id: customers_comments.id,
                comment: customers_comments.comment,
                customer_id: customers_comments.customer_id,
                created_at: customers_comments.created_at,
            })
            .from(customers_comments)
            .where(eq(customers_comments.customer_id, sql.placeholder('customer_id')))
            .prepare('customer_comments_by_customer_id')

        const customerComments = await customerCommentsPrepare.execute({
            customer_id: order[0].customer_id
        });

        let res = [];
        for (const comment of customerComments) {
            res.push({
                id: comment.id,
                comment: comment.comment,
                customer_id: comment.customer_id,
                created_at: comment.created_at,
            });
        }


        res.push({
            id: order[0].id,
            comment: order[0].delivery_comment,
            customer_id: order[0].customer_id,
            created_at: order[0].created_at,
        });

        return res;
    }, {
        permission: 'orders.list',
        params: t.Object({
            id: t.String(),
        }),
    })
    .post('/api/orders/my_history', async ({ drizzle, set, user, cacheControl, body: {
        startDate,
        endDate,
        limit,
        page
    } }) => {

        const courierIds: string[] = [];
        // @ts-ignore
        const courierRole = user.access.roles.find(role => role.code === "courier");
        // @ts-ignore
        const managerRole = user.access.roles.find(role => role.code === "manager");



        const orderStatuses = await cacheControl.getOrderStatuses();

        const finishedOrderStatuses = orderStatuses
            .filter((orderStatus) => orderStatus.finish || orderStatus.cancel)
            .map((orderStatus) => orderStatus.id);

        startDate = dayjs(startDate).format("YYYY-MM-DD") + " 00:00:00";
        endDate = dayjs(endDate).format("YYYY-MM-DD") + " 23:59:59";

        const offset = (page - 1) * limit;
        const couriers = alias(users, "couriers");

        if (courierRole) {
            // @ts-ignore
            courierIds.push(user.user.id);
            const ordersCount = await drizzle.select({
                count: sql<number>`count(*)`
            }).from(orders).where(and(
                inArray(orders.courier_id, courierIds),
                inArray(orders.order_status_id, finishedOrderStatuses),
                gte(orders.created_at, startDate),
                lte(orders.created_at, endDate)
            )).execute();

            const ordersList = await drizzle
                .select({
                    ...getTableColumns(orders),
                    orders_organization: {
                        id: organization.id,
                        name: organization.name,
                        icon_url: organization.icon_url,
                        active: organization.active,
                        external_id: organization.external_id,
                        support_chat_url: organization.support_chat_url,
                    },
                    orders_customers: {
                        id: customers.id,
                        name: customers.name,
                        phone: customers.phone,
                    },
                    orders_order_status: {
                        id: order_status.id,
                        name: order_status.name,
                        finish: order_status.finish,
                        cancel: order_status.cancel,
                        on_way: order_status.on_way,
                        in_terminal: order_status.in_terminal
                    },
                    orders_terminals: {
                        id: terminals.id,
                        name: terminals.name
                    },
                    orders_couriers: {
                        id: couriers.id,
                        first_name: couriers.first_name,
                        last_name: couriers.last_name,
                    },
                })
                .from(orders)
                .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                .leftJoin(couriers, eq(orders.courier_id, couriers.id))
                .leftJoin(organization, eq(orders.organization_id, organization.id))
                .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                .leftJoin(customers, eq(orders.customer_id, customers.id))
                .where(and(
                    inArray(orders.courier_id, courierIds),
                    inArray(orders.order_status_id, finishedOrderStatuses),
                    gte(orders.created_at, startDate),
                    lte(orders.created_at, endDate)
                ))
                .orderBy(desc(orders.created_at))
                .limit(limit)
                .offset(offset)
                .execute();
            return {
                orders: ordersList.map((order) => {
                    if (order.orders_organization && order.orders_organization.icon_url) {
                        order.orders_organization.icon_url = order.orders_organization.icon_url.replace('model_uploads', 'public/model_uploads');
                    }
                    return order;
                }),
                totalCount: ordersCount[0].count,
            };
        } else if (managerRole) {
            const userTerminalsList = await drizzle
                .select({
                    terminal_id: users_terminals.terminal_id
                })
                .from(users_terminals)
                // @ts-ignore
                .where(eq(users_terminals.user_id, user.user.id))
                .execute() as InferSelectModel<typeof users_terminals>[];
            const terminalIds = userTerminalsList.map(item => item.terminal_id);
            const ordersCount = await drizzle.select({
                count: sql<number>`count(*)`
            }).from(orders).where(and(
                inArray(orders.terminal_id, terminalIds),
                inArray(orders.order_status_id, finishedOrderStatuses),
                gte(orders.created_at, startDate),
                lte(orders.created_at, endDate)
            )).execute();

            const ordersList = await drizzle
                .select({
                    ...getTableColumns(orders),
                    orders_organization: {
                        id: organization.id,
                        name: organization.name,
                        icon_url: organization.icon_url,
                        active: organization.active,
                        external_id: organization.external_id,
                        support_chat_url: organization.support_chat_url,
                    },
                    orders_customers: {
                        id: customers.id,
                        name: customers.name,
                        phone: customers.phone,
                    },
                    orders_order_status: {
                        id: order_status.id,
                        name: order_status.name,
                        finish: order_status.finish,
                        cancel: order_status.cancel,
                        on_way: order_status.on_way,
                        in_terminal: order_status.in_terminal
                    },
                    orders_terminals: {
                        id: terminals.id,
                        name: terminals.name
                    },
                    orders_couriers: {
                        id: couriers.id,
                        first_name: couriers.first_name,
                        last_name: couriers.last_name,
                    },
                })
                .from(orders)
                .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
                .leftJoin(couriers, eq(orders.courier_id, couriers.id))
                .leftJoin(organization, eq(orders.organization_id, organization.id))
                .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                .leftJoin(customers, eq(orders.customer_id, customers.id))
                .where(and(
                    inArray(orders.terminal_id, terminalIds),
                    inArray(orders.order_status_id, finishedOrderStatuses),
                    gte(orders.created_at, startDate),
                    lte(orders.created_at, endDate)
                ))
                .orderBy(desc(orders.created_at))
                .limit(limit)
                .offset(offset)
                .execute();
            return {
                orders: ordersList.map((order) => {
                    if (order.orders_organization && order.orders_organization.icon_url) {
                        order.orders_organization.icon_url = order.orders_organization.icon_url.replace('model_uploads', 'public/model_uploads');
                    }
                    return order;
                }),
                totalCount: ordersCount[0].count,
            };
        } else {
            return {
                orders: [],
                totalCount: 0,
            };
        }


    }, {
        permission: 'orders.list',
        body: t.Object({
            startDate: t.String(),
            endDate: t.String(),
            limit: t.Number(),
            page: t.Number(),
        }),
    })
    .post('/api/orders/management', async ({
        drizzle, set, user, cacheControl, body: {
            page,
            limit,
        }
    }) => {

        // @ts-ignore
        const managerRole = user.access.roles.find(role => role.code === "manager");

        if (!managerRole) {
            set.status = 401;
            return {
                message: "You don't have permissions",
            };
        }

        const usersTerminals = await drizzle.select({
            terminal_id: users_terminals.terminal_id
        })
            .from(users_terminals)
            .where(
                // @ts-ignore
                eq(users_terminals.user_id, user.user.id)
            ).execute();

        const orderStatuses = await cacheControl.getOrderStatuses();

        const pendingStatusIds: string[] = [];

        const organizations = await cacheControl.getOrganizations();

        for (const organization of organizations) {
            const onWayStatus = orderStatuses.find(orderStatus => orderStatus.on_way && orderStatus.organization_id === organization.id);

            if (onWayStatus) {
                pendingStatusIds.push(...orderStatuses.filter(orderStatus => orderStatus.organization_id === organization.id && orderStatus.sort < onWayStatus.sort).map(orderStatus => orderStatus.id));
            }

        }

        const startDate = dayjs().subtract(2, 'days').format("YYYY-MM-DD HH:mm:ss");
        const endDate = dayjs().format("YYYY-MM-DD HH:mm:ss");

        if (pendingStatusIds.length == 0) {
            return {
                orders: [],
                totalCount: 0,
            };
        }

        const offset = (page - 1) * limit;
        const couriers = alias(users, "couriers");

        const ordersCount = await drizzle.select({
            count: sql<number>`count(*)`
        }).from(orders).where(and(
            inArray(orders.order_status_id, pendingStatusIds),
            inArray(orders.terminal_id, usersTerminals.map(item => item.terminal_id)),
            gte(orders.created_at, startDate),
            lte(orders.created_at, endDate)
        )).execute();

        const ordersList = await drizzle
            .select({
                ...getTableColumns(orders),
                orders_organization: {
                    id: organization.id,
                    name: organization.name,
                    icon_url: organization.icon_url,
                    active: organization.active,
                    external_id: organization.external_id,
                    support_chat_url: organization.support_chat_url,
                },
                orders_customers: {
                    id: customers.id,
                    name: customers.name,
                    phone: customers.phone,
                },
                orders_order_status: {
                    id: order_status.id,
                    name: order_status.name,
                    finish: order_status.finish,
                    cancel: order_status.cancel,
                    on_way: order_status.on_way,
                    in_terminal: order_status.in_terminal
                },
                orders_terminals: {
                    id: terminals.id,
                    name: terminals.name
                },
                orders_couriers: {
                    id: couriers.id,
                    first_name: couriers.first_name,
                    last_name: couriers.last_name,
                },
            })
            .from(orders)
            .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
            .leftJoin(couriers, eq(orders.courier_id, couriers.id))
            .leftJoin(organization, eq(orders.organization_id, organization.id))
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .leftJoin(customers, eq(orders.customer_id, customers.id))
            .where(and(
                inArray(orders.order_status_id, pendingStatusIds),
                inArray(orders.terminal_id, usersTerminals.map(item => item.terminal_id)),
                gte(orders.created_at, startDate),
                lte(orders.created_at, endDate)
            ))
            .orderBy(desc(orders.created_at))
            .limit(limit)
            .offset(offset)
            .execute();

        return {
            orders: ordersList,
            totalCount: ordersCount[0].count,
        };

    }, {
        permission: 'orders.list',
        body: t.Object({
            page: t.Number(),
            limit: t.Number(),
        }),
    })
    .post('/api/orders/:id/cancel', async ({ params: { id }, body: { text }, drizzle, cacheControl, set, user, queues: {
        processOrderChangeStatusQueue
    } }) => {

        const order = await drizzle
            .select({
                id: orders.id,
                organization_id: orders.organization_id,
                order_status_id: orders.order_status_id,
                created_at: orders.created_at
            })
            .from(orders)
            .where(eq(orders.id, id))
            .execute();

        const organizationId = order[0].organization_id;

        const orderStatuses = await cacheControl.getOrderStatuses();

        const canceledOrderStatus = orderStatuses.find(orderStatus => orderStatus.cancel && orderStatus.organization_id === organizationId);

        const result = await drizzle
            .update(orders)
            .set({
                order_status_id: canceledOrderStatus!.id,
                cancel_reason: text
            })
            .where(eq(orders.id, id))
            .returning({
                id: orders.id,
                order_status_id: orders.order_status_id
            });

        await processOrderChangeStatusQueue.add(`${order[0].id}${new Date().getTime()}`, {
            order_id: id,
            before_status_id: order[0].order_status_id,
            after_status_id: canceledOrderStatus!.id,
            user_id: user?.user.id
        }, {
            attempts: 3, removeOnComplete: true
        });

        return {
            data: result[0],
        };
    }, {
        permission: 'orders.list',
        body: t.Object({
            text: t.String(),
        }),
        params: t.Object({
            id: t.String(),
        }),
    })
    .post('/api/orders/:id/locations', async ({ params: { id }, body: { created_at }, drizzle, set, user }) => {
        const locations = (await drizzle
            .select({
                ...getTableColumns(order_locations),
                order_status: {
                    id: order_status.id,
                    name: order_status.name,
                    color: order_status.color,
                }
            })
            .from(order_locations)
            .leftJoin(order_status, eq(order_locations.order_status_id, order_status.id))
            .where(and(
                eq(order_locations.order_id, id),
                lte(order_locations.order_created_at, dayjs(created_at).add(2, 'hours').format("YYYY-MM-DD HH:mm:ss")),
                gte(order_locations.order_created_at, dayjs(created_at).subtract(2, 'hours').format("YYYY-MM-DD HH:mm:ss"))
            ))
            .orderBy(asc(order_locations.created_at))
            .execute()) as OrderLocationsWithRelations[];


        return locations;
    }, {
        permission: 'orders.list',
        params: t.Object({
            id: t.String(),
        }),
        body: t.Object({
            created_at: t.String(),
        }),
    })
    .get(
        '/api/orders/terminal-delivery-stats',
        async ({ query, drizzle }) => {
            const { terminal_id, from_date, to_date } = query;
            
            // Split terminal_id by comma if multiple terminals are provided
            const terminalIds = terminal_id ? terminal_id.split(',') : [];
            
            if (terminalIds.length === 0) {
                return {
                    error: "No terminal_id provided"
                };
            }
            
            // Prepare SQL condition for multiple terminals
            const terminalCondition = terminalIds.length > 0 ? 
                sql`o.terminal_id IN (${sql.raw(terminalIds.map(id => `'${id}'`).join(','))})` : 
                sql`FALSE`;
            
            // Get the statistics for each terminal
            const terminalStats = await drizzle.execute(sql`
                WITH delivery_times AS (
                    SELECT 
                        o.id AS order_id,
                        o.terminal_id,
                        t.name AS terminal_name,
                        EXTRACT(EPOCH FROM (o.finished_date - o.created_at)) AS delivery_seconds
                    FROM orders o
                    JOIN terminals t ON o.terminal_id = t.id
                    JOIN order_status os ON o.order_status_id = os.id
                    WHERE 
                        ${terminalCondition}
                        AND o.created_at >= ${dayjs(from_date).toISOString()}
                        AND o.created_at <= ${dayjs(to_date).add(1, 'days').toISOString()}
                        AND o.finished_date IS NOT NULL
                        AND os.finish = true
                )
                SELECT 
                    dt.terminal_id,
                    dt.terminal_name,
                    COUNT(*) AS total_orders,
                    MIN(dt.delivery_seconds) AS fastest_delivery_seconds,
                    MAX(dt.delivery_seconds) AS slowest_delivery_seconds,
                    AVG(dt.delivery_seconds) AS average_delivery_seconds,
                    (SELECT order_id FROM delivery_times WHERE delivery_seconds = MIN(dt.delivery_seconds) AND terminal_id = dt.terminal_id LIMIT 1) AS fastest_order_id,
                    (SELECT order_id FROM delivery_times WHERE delivery_seconds = MAX(dt.delivery_seconds) AND terminal_id = dt.terminal_id LIMIT 1) AS slowest_order_id
                FROM delivery_times dt
                GROUP BY dt.terminal_id, dt.terminal_name
            `);
            
            // Format the results
            const formattedStats = terminalStats.rows.map(stat => ({
                terminal_id: stat.terminal_id,
                terminal_name: stat.terminal_name,
                total_orders: stat.total_orders,
                fastest_delivery: fancyTimeFormat(Number(stat.fastest_delivery_seconds)),
                slowest_delivery: fancyTimeFormat(Number(stat.slowest_delivery_seconds)),
                average_delivery: fancyTimeFormat(Number(stat.average_delivery_seconds)),
                fastest_order_id: stat.fastest_order_id,
                slowest_order_id: stat.slowest_order_id
            }));
            
            return formattedStats;
        },
        {
            query: t.Object({
                terminal_id: t.String(),
                from_date: t.String(),
                to_date: t.String(),
            })
        }
    )