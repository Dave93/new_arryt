import { api_tokens, order_actions, orders, users } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import dayjs from "dayjs";
import { and, desc, eq, gte } from "drizzle-orm";
import Redis from "ioredis";

export default async function processNoorCallback(redis: Redis, db: DB, cacheControl: CacheControlService, data: any) {
    console.log('[NC] === START processNoorCallback ===');
    console.log('[NC] callback data:', JSON.stringify(data));
    console.log('[NC] callback stage:', data.stage);
    console.log('[NC] time:', dayjs().format('DD.MM.YYYY HH:mm:ss'));

    const noorOrderId = data.id?.toString();
    if (!noorOrderId) {
        console.log('[NC] SKIP: no order id in callback data');
        return 'processNoorCallback';
    }

    const order = await db.query.orders.findFirst({
        where: and(
            eq(orders.noor_id, noorOrderId),
            gte(orders.created_at, dayjs().subtract(2, 'day').toISOString()),
        ),
    });

    if (!order) {
        console.log(`[NC] SKIP: order not found for noor_id=${noorOrderId}`);
        return 'processNoorCallback';
    }

    console.log(`[NC] order found: id=${order.id}, order_number=${order.order_number}, courier_id=${order.courier_id}, current_status_id=${order.order_status_id}, org_id=${order.organization_id}`);

    // Verify courier is the Noor virtual courier
    const noorCourier = await db.query.users.findFirst({
        where: eq(users.phone, '+998900000001'),
    });

    if (order.courier_id != noorCourier?.id) {
        console.log(`[NC] SKIP: courier mismatch. order.courier_id=${order.courier_id}, noorCourier.id=${noorCourier?.id}`);
        return 'processNoorCallback';
    }

    const orderStatuses = await cacheControl.getOrderStatuses();
    const organizations = await cacheControl.getOrganizations();

    // Build status mapping from noor_delivery_statuses field
    const orderStatusByOrganization: {
        [key: string]: {
            [key: string]: string;
        };
    } = orderStatuses.reduce((acc: {
        [key: string]: {
            [key: string]: string;
        };
    }, status) => {
        if (!acc[status.organization_id]) {
            acc[status.organization_id] = {};
        }
        if (status.noor_delivery_statuses) {
            status.noor_delivery_statuses.split(',').forEach((stat: string) => {
                acc[status.organization_id][stat.trim()] = status.id;
            });
        }
        return acc;
    }, {});

    const org = organizations.find((o) => o.id == order.organization_id)!;
    const stage = data.stage?.toString();

    // Check operator-initiated cancel flag
    const operatorCancelFlag = await redis.get(`noor_operator_cancel:${noorOrderId}`);
    if (operatorCancelFlag) {
        console.log(`[NC] SKIP: operator-initiated cancel for noor_id=${noorOrderId}, order_id=${order.id}`);
        await redis.del(`noor_operator_cancel:${noorOrderId}`);

        await db.update(orders).set({
            courier_id: null,
            noor_id: null,
        }).where(and(eq(orders.id, order.id), gte(orders.created_at, dayjs().subtract(2, 'day').toISOString())));

        return 'processNoorCallback';
    }

    // Map Noor stage to our order status
    const orgStatuses = orderStatusByOrganization[order.organization_id];
    const orderStatusId = orgStatuses?.[stage];
    console.log(`[NC] status mapping: noor_stage="${stage}", mapped_orderStatusId=${orderStatusId}, available_mappings=${JSON.stringify(orgStatuses)}`);

    if (!orderStatusId) {
        console.log(`[NC] SKIP: no orderStatusId mapping for noor stage "${stage}" in org ${order.organization_id}`);
    }

    if (orderStatusId) {
        if (order.order_status_id != orderStatusId) {
            console.log(`[NC] status changed: ${order.order_status_id} -> ${orderStatusId}`);

            const lastOrderActions = await db.select({
                id: order_actions.id,
                created_at: order_actions.created_at,
            })
                .from(order_actions)
                .where(
                    and(
                        eq(order_actions.order_id, order.id),
                        eq(order_actions.action, 'STATUS_CHANGE'),
                    )
                )
                .orderBy(desc(order_actions.created_at))
                .limit(1);

            // Send courier info to organization webhook if courier data available
            try {
                if (data.courier && data.courier.phone) {
                    const courierPhone = data.courier.phone;
                    const courierName = `${data.courier.first_name || ''} ${data.courier.last_name || ''}`.trim();

                    const webhookUrl = org.webhook;
                    if (webhookUrl) {
                        const orderIsSent = await redis.get(`courier_info_sent:${order.id}_${courierPhone}`) == 'true';
                        if (!orderIsSent) {
                            const apiToken = await db.query.api_tokens.findFirst({
                                where: eq(api_tokens.organization_id, org.id),
                                columns: {
                                    token: true,
                                },
                            });

                            const webhookData = {
                                log: {
                                    action: 'SET_NOOR_COURIER',
                                    courier_name: courierName,
                                    phone: courierPhone,
                                },
                                order: {
                                    id: order.order_number,
                                },
                            };

                            const webhookFetch = await fetch(webhookUrl, {
                                method: 'POST',
                                headers: {
                                    'Accept-Language': 'ru',
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${apiToken!.token}`,
                                },
                                body: JSON.stringify(webhookData),
                            });
                            const webhookResponse = await webhookFetch.text();
                            console.log('[NC] webhookResponse', webhookResponse);
                            await redis.set(`courier_info_sent:${order.id}_${courierPhone}`, 'true', 'EX', 60 * 60 * 3);
                        }
                    }
                }
            } catch (e) {
                console.log('[NC] ERROR: webhook failed', e);
            }

            // Log order action
            const lastOrderActionCreatedAt = lastOrderActions[0]?.created_at;
            const lastOrderActionCreatedAtDifference = lastOrderActionCreatedAt
                ? Math.floor((new Date().getTime() - new Date(lastOrderActionCreatedAt).getTime()) / 1000)
                : 0;

            const orderResStatus = orderStatuses.find((s) => s.id === orderStatusId);

            await db.insert(order_actions).values({
                terminal_id: order.terminal_id,
                order_id: order.id,
                order_created_at: order.created_at,
                action: 'STATUS_CHANGE',
                action_text: `Noor: Статус заказа изменен на "${orderResStatus!.name}"`,
                duration: lastOrderActionCreatedAtDifference,
            });
        }

        // Handle finished status
        let finishedDate = null;
        const finishedOrderStatusIds = orderStatuses.filter((item) => item.finish).map((item) => item.id);
        if (finishedOrderStatusIds.includes(orderStatusId)) {
            finishedDate = new Date();
        }

        await db.update(orders).set({
            order_status_id: orderStatusId,
            finished_date: finishedDate?.toISOString() || undefined,
        }).where(and(eq(orders.id, order.id), gte(orders.created_at, dayjs().subtract(2, 'day').toISOString())));
    }

    return 'processNoorCallback';
}
