import { api_tokens, order_actions, orders } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { getUzumCourierId, UZUM_BASE_URL, uzumHeaders } from "@api/src/utils/uzum";
import dayjs from "dayjs";
import { and, desc, eq, gte } from "drizzle-orm";
import Redis from "ioredis";

export default async function processUzumCallback(redis: Redis, db: DB, cacheControl: CacheControlService, data: any) {

    console.log('[UC] === START processUzumCallback ===');
    console.log('[UC] callback data:', JSON.stringify(data));
    console.log('[UC] time:', dayjs().format('DD.MM.YYYY HH:mm:ss'));
    const claimId = data.claim_id;
    const order = await db.query.orders.findFirst({
        where: and(
            eq(orders.uzum_id, claimId),
            gte(orders.created_at, dayjs().subtract(2, 'day').toISOString()),
        ),
    });

    if (!order) {
        console.log(`[UC] SKIP: order not found for claim_id=${claimId}`);
        return 'processUzumCallback';
    }

    console.log(`[UC] order found: id=${order.id}, order_number=${order.order_number}, courier_id=${order.courier_id}, current_status_id=${order.order_status_id}, org_id=${order.organization_id}`);

    const uzumCourierId = await getUzumCourierId(cacheControl);
    if (!uzumCourierId) {
        console.log('[UC] SKIP: uzum_courier_id system config is missing');
        return 'processUzumCallback';
    }
    if (order.courier_id != uzumCourierId) {
        console.log(`[UC] SKIP: courier mismatch. order.courier_id=${order.courier_id}, uzumCourierId=${uzumCourierId}`);
        return {
            success: true,
        };
    }

    const orderStatuses = await cacheControl.getOrderStatuses();
    const organizations = await cacheControl.getOrganizations();

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
        if (status.yandex_delivery_statuses) {
            status.yandex_delivery_statuses.split(',').forEach((stat) => {
                acc[status.organization_id][stat] = status.id;
            });
        }
        return acc;
    }, {});

    const org = organizations.find((o) => o.id == order.organization_id)!;

    let uzumResponse: any = {};
    try {
        const uzumFetch = await fetch(`${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/info?claim_id=${claimId}`, {
            method: 'POST',
            headers: uzumHeaders(),
        });
        uzumResponse = await uzumFetch.json();
        console.log(`[UC] claims/info response: status=${uzumResponse.status}, performer_info=${JSON.stringify(uzumResponse.performer_info)}`);
    } catch (error) {
        console.log('[UC] ERROR: claims/info request failed', error);
        return {
            success: false,
        };
    }
    const orgStatuses = orderStatusByOrganization[order.organization_id];
    const orderStatusId = orgStatuses?.[uzumResponse.status];
    console.log(`[UC] status mapping: uzum_status="${uzumResponse.status}", mapped_orderStatusId=${orderStatusId}, available_mappings=${JSON.stringify(orgStatuses)}`);

    const operatorCancelFlag = await redis.get(`uzum_operator_cancel:${claimId}`);
    if (operatorCancelFlag) {
        console.log(`[UC] SKIP: operator-initiated cancel for claim_id=${claimId}, order_id=${order.id}`);
        await redis.del(`uzum_operator_cancel:${claimId}`);

        await db.update(orders).set({
            courier_id: null,
            uzum_id: null,
        }).where(and(eq(orders.id, order.id), gte(orders.created_at, dayjs().subtract(2, 'day').toISOString())));

        return 'processUzumCallback';
    }

    if (!orderStatusId) {
        console.log(`[UC] SKIP: no orderStatusId mapping for uzum status "${uzumResponse.status}" in org ${order.organization_id}`);
    }
    if (orderStatusId) {
        if (order.order_status_id == orderStatusId) {
            console.log(`[UC] SKIP voice forwarding: status unchanged. order.order_status_id=${order.order_status_id} == orderStatusId=${orderStatusId}`);
        }
        if (order.order_status_id != orderStatusId) {
            console.log(`[UC] status changed: ${order.order_status_id} -> ${orderStatusId}, proceeding with voice forwarding`);
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

            try {
                const voiceForwardUrl = `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/v2/driver-voiceforwarding`;
                const voiceForwardFetch = await fetch(voiceForwardUrl, {
                    method: 'POST',
                    headers: uzumHeaders(),
                    body: JSON.stringify({
                        claim_id: claimId,
                    }),
                });
                const voiceForwardResponse: any = await voiceForwardFetch.json();
                console.log(`[UC] voiceForward response:`, JSON.stringify(voiceForwardResponse));
                if (!voiceForwardResponse.phone) {
                    console.log(`[UC] SKIP webhook: no phone in voiceForward response`);
                }
                if (voiceForwardResponse.phone) {
                    const webhookUrl = org.webhook;
                    console.log(`[UC] webhookUrl=${webhookUrl}, phone=${voiceForwardResponse.phone}`);
                    if (!webhookUrl) {
                        console.log(`[UC] SKIP webhook: org has no webhook URL`);
                    }
                    if (webhookUrl) {
                        const orderIsSent = await redis.get(`courier_info_sent:${order.id}_${voiceForwardResponse.phone}`) == 'true';
                        console.log(`[UC] orderIsSent=${orderIsSent} (key: courier_info_sent:${order.id}_${voiceForwardResponse.phone})`);
                        if (!orderIsSent) {
                            const apiToken = await db.query.api_tokens.findFirst({
                                where: eq(api_tokens.organization_id, org.id),
                                columns: {
                                    token: true,
                                },
                            });
                            const webhookData: any = {
                                log: {
                                    action: 'SET_UZUM_COURIER',
                                    courier_name: uzumResponse?.performer_info?.courier_name ?? '',
                                    phone: voiceForwardResponse.phone,
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
                            console.log('[UC] webhookResponse', webhookResponse);
                            await redis.set(`courier_info_sent:${order.id}_${voiceForwardResponse.phone}`, 'true', 'EX', 60 * 60 * 60);
                        }

                    }
                }
            } catch (e) {
                console.log('[UC] ERROR: voiceForward/webhook failed', e);
            }

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
                action_text: `Статус заказа изменен на "${orderResStatus!.name}"`,
                duration: lastOrderActionCreatedAtDifference,
            });
        }
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
    return 'processUzumCallback';
}
