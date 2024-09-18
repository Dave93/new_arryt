import { api_tokens, order_actions, orders, users } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import dayjs from "dayjs";
import { and, desc, eq, gte } from "drizzle-orm";
import Redis from "ioredis";

export default async function processYandexCallback(redis: Redis, db: DB, cacheControl: CacheControlService, data: any) {
    console.log('processYandexCallback', data);
    const claimId = data.claim_id;
    const order = await db.query.orders.findFirst({
        where: and(
            eq(orders.yandex_id, claimId),
            gte(orders.created_at, dayjs().subtract(2, 'day').toISOString()),
        ),
    });

    if (order) {
        const yandexCourier = await db.query.users.findFirst({
            where: eq(users.phone, '+998908251218'),
        });
        if (order.courier_id != yandexCourier?.id) {
            return {
                success: true,
            }
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
        console.log('orderStatusByOrganization', orderStatusByOrganization);
        console.log('data', data);
        const org = organizations.find((o) => o.id == order.organization_id)!;

        const courierSearchingStatuses = ['performer_lookup', 'performer_draft', 'performer_not_found'];

        const orderDate = dayjs(order.created_at);

        // get date difference in minutes using dayjs
        const dateDiff = dayjs().diff(orderDate, 'minute');

        const yandexCourierWaitTime = +(await cacheControl.getSetting('yandex_courier_wait_time'));

        console.log('yandexCourier', yandexCourier);
        console.log('order.courier_id', order.courier_id);
        let yandexResponse: any = {};
        try {
            const yandexFetch = await fetch(`https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/info?claim_id=${claimId}`, {
                method: 'POST',
                headers: {
                    'Accept-Language': 'ru',
                    Authorization: `Bearer ${process.env.YANDEX_DELIVERY_TOKEN}`,
                },
            });
            yandexResponse = await yandexFetch.json();
        } catch (error) {
            console.log('yandexResponseError', error);
            return {
                success: false,
            };
        }
        console.log('yandexResponse', yandexResponse);
        const orderStatusId = orderStatusByOrganization[order.organization_id][yandexResponse.status];
        // if (
        //     yandexCourierWaitTime &&
        //     dateDiff >= yandexCourierWaitTime &&
        //     courierSearchingStatuses.includes(data.status)
        // ) {
        //     const approveUrl = `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/cancel?claim_id=${data.claim_id}`;
        //     const approveResponse = await lastValueFrom(
        //         this.httpService
        //             .post(
        //                 approveUrl,
        //                 {
        //                     cancel_state: 'free',
        //                     version: yandexResponse.version,
        //                 },
        //                 {
        //                     headers: {
        //                         'Accept-Language': 'ru',
        //                         Authorization: `Bearer ${this.configService.get('YANDEX_DELIVERY_TOKEN')}`,
        //                     },
        //                 },
        //             )
        //             .pipe(map((response) => response.data)),
        //     );
        //     await this.prismaService.orders.update({
        //         where: {
        //             id: order.id,
        //         },
        //         data: {
        //             orders_couriers: {
        //                 disconnect: true,
        //             },
        //         },
        //         select: {
        //             id: true,
        //         },
        //     });

        //     await this.searchService.deleteYandexDeliveryOrder(order.id);
        //     await this.orderIndexQueue.add(
        //         'processOrderIndex',
        //         {
        //             orderId: order.id,
        //         },
        //         { attempts: 3, removeOnComplete: true },
        //     );
        // }
        // else
        if (orderStatusId) {
            if (order.order_status_id != orderStatusId) {
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
                    const voiceForwardUrl = `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/driver-voiceforwarding`;
                    const voiceForwardFetch = await fetch(voiceForwardUrl, {
                        method: 'POST',
                        headers: {
                            'Accept-Language': 'ru',
                            Authorization: `Bearer ${process.env.YANDEX_DELIVERY_TOKEN}`,
                        },
                        body: JSON.stringify({
                            claim_id: claimId,
                        }),
                    });
                    const voiceForwardResponse = await voiceForwardFetch.json();
                    console.log('voiceForwardResponse', voiceForwardResponse);
                    if (voiceForwardResponse.phone) {
                        // await this.searchService.updateYandexDeliveryOrders([
                        //     {
                        //         order_id: order.id,
                        //         order_data: {
                        //             ...data,
                        //             voice_forwarding_phone: voiceForwardResponse.phone,
                        //         },
                        //     },
                        // ]);

                        const webhookUrl = org.webhook;
                        if (webhookUrl) {
                            const apiToken = await db.query.api_tokens.findFirst({
                                where: eq(api_tokens.organization_id, org.id),
                                columns: {
                                    token: true,
                                },
                            });
                            const webhookData: any = {
                                log: {
                                    action: 'SET_YANDEX_COURIER',
                                    courier_name: yandexResponse?.performer_info?.courier_name ?? '',
                                    phone: voiceForwardResponse.phone,
                                },
                                order: {
                                    id: order.order_number,
                                },
                            };
                            console.log('webhookData', webhookData);
                            console.log('webhookUrl', webhookUrl);
                            console.log('apiToken', apiToken);
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
                            console.log('webhookResponse', webhookResponse);
                        }
                    }
                } catch (e) {
                    console.log('voiceForwardError', e);
                }

                // get last order action created_at difference from now in seconds
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
    }
    return 'processYandexCallback';
}