import { delivery_pricing, orders } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import getFirebaseAccessToken from "@queue/lib";
import { and, eq } from "drizzle-orm";
import Redis from "ioredis";
import processCheckAndSendYandex from "./check_and_send_yandex";
import { Queue } from "bullmq";

type TryAssignCourierData = {
    order_id: string;
    created_at: string;
    courier_id?: string;
    queue: number;
}

export default async function processTryAssignCourier(redis: Redis, db: DB, cacheControl: CacheControlService, data: TryAssignCourierData, tryAssignCourierQueue: Queue) {
    console.time('processTryAssignCourier');
    const { order_id, created_at } = data;

    console.time('getTerminals');
    const terminals = await cacheControl.getTerminals();
    console.timeEnd('getTerminals');

    const order = await db
        .select({
            id: orders.id,
            order_status_id: orders.order_status_id,
            courier_id: orders.courier_id,
            terminal_id: orders.terminal_id,
            delivery_pricing_id: orders.delivery_pricing_id
        })
        .from(orders)
        .where(
            and(
                eq(orders.id, order_id),
                eq(orders.created_at, created_at)
            )
        )
        .execute();

    console.log('order', order);

    const organizationStatuses = await cacheControl.getOrderStatuses();

    const orderStatus = organizationStatuses.find(status => status.id === order[0].order_status_id);

    console.log('orderStatus', orderStatus);

    const deliveryPricing = await cacheControl.getDeliveryPricingById(order[0].delivery_pricing_id!);

    if (orderStatus!.sort <= 1 && !order[0].courier_id) {

        if (data.queue > 2) {
            if (order[0].terminal_id == '621c0913-93d0-4eeb-bf00-f0c6f578bcd1') {
                await processCheckAndSendYandex(db, redis, cacheControl, order_id);
            }
        }
        else {

            const nextCourier = await cacheControl.getNextQueueCourier(order[0].terminal_id, deliveryPricing!.drive_type, data.courier_id);
            console.log('nextCourier', nextCourier);

            if (nextCourier) {
                await db.update(orders).set({
                    courier_id: nextCourier
                })
                    .where(eq(orders.id, order_id))
                    .execute();

                // Send push notification to courier using Firebase Cloud Messaging
                const accessToken = await getFirebaseAccessToken();
                const courierFcmToken = await cacheControl.getCourierFcmToken(nextCourier);

                if (courierFcmToken) {
                    const message = {
                        token: courierFcmToken,
                        notification: {
                            title: "Примите новый заказ",
                            body: `Вы были назначены на новый заказ: ${order_id}`,
                            android: {
                                notification: {
                                    click_action: "OPEN_ORDER_DETAILS",
                                    buttons: [
                                        {
                                            text: "Принять",
                                            action: "accept"
                                        },
                                        {
                                            text: "Отклонить",
                                            action: "reject"
                                        }
                                    ]
                                }
                            },
                            apns: {
                                payload: {
                                    aps: {
                                        category: "NEW_ORDER_CATEGORY"
                                    }
                                }
                            }
                        },
                        data: {
                            orderId: order_id,
                            createdAt: created_at
                        }
                    };

                    try {
                        const response = await fetch('https://fcm.googleapis.com/v1/projects/arryt-b201e/messages:send', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ message })
                        });

                        if (!response.ok) {
                            console.error('Failed to send push notification:', await response.text());
                        } else {
                            console.log('Push notification sent successfully');
                        }
                    } catch (error) {
                        console.error('Error sending push notification:', error);
                    }
                } else {
                    console.warn(`No FCM token found for courier ${nextCourier}`);
                }
            } else {
                await tryAssignCourierQueue.add(`${order_id}_${data.queue + 1}`, {
                    order_id,
                    created_at,
                    queue: data.queue + 1
                }, {
                    delay: 1000 * 60 * 5
                });
            }
        }
    }

    console.log('organizationStatuses', organizationStatuses);
    console.timeEnd('processTryAssignCourier');

}