import { DB } from "@api/src/lib/db";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { orders, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";
import getFirebaseAccessToken from "@queue/lib";

export default async function processNewOrderNotify(redis: Redis, db: DB, cacheControl: CacheControlService, order: typeof orders.$inferSelect) {
    const orderStatuses = await cacheControl.getOrderStatuses();
    const organizationOrderStatuses = orderStatuses.filter((status) => status.organization_id === order.organization_id);
    // get order statuses that need notification
    const orderStatusesThatNeedNotification = organizationOrderStatuses.filter(
        (orderStatus) => !orderStatus.finish && !orderStatus.cancel,
    );

    const organization = await cacheControl.getOrganization(order.organization_id);
    // organization max active order count
    const maxActiveOrderCount = organization.max_active_order_count;
    console.time('newOrderNotifyCourierIds')
    const activeOrders = await db.select({
        courier_id: orders.courier_id,
        count: sql<number>`count(*) as count`,
    }).from(orders).where(
        and(
            eq(orders.terminal_id, order.terminal_id),
            inArray(orders.order_status_id, orderStatusesThatNeedNotification.map((status) => status.id)),
            gte(orders.created_at, sql`now() - interval '6 hours'`),
            isNotNull(orders.courier_id),
        ),
    ).groupBy(orders.courier_id).having(sql`count(*) < ${maxActiveOrderCount}`);
    console.timeEnd('newOrderNotifyCourierIds')
    const courierIds = activeOrders.map((o) => o.courier_id!);
    console.log('new order notify courierIds', courierIds)
    if (courierIds.length > 0) {

        const onlineUsers = await db.select({
            id: users.id,
            fcm_token: users.fcm_token,
        }).from(users).where(and(
            inArray(users.id, courierIds),
            eq(users.is_online, true),
        ));

        if (onlineUsers.length > 0) {
            const deviceIds = onlineUsers.map((user) => user.fcm_token).filter((deviceId) => deviceId !== null && deviceId !== undefined && deviceId !== '');
            console.log('deviceIds', deviceIds)

            if (deviceIds.length > 0) {
                const accessToken = await getFirebaseAccessToken();
                
                for (const deviceId of deviceIds) {
                    const message = {
                        message: {
                            token: deviceId!,
                            notification: {
                                title: 'Поступил новый заказ',
                                body: `Новый заказ №${order.order_number} доступен для вас`
                            },
                            data: {
                                order_id: order.id,
                                order_status_id: order.order_status_id,
                                terminal_id: order.terminal_id
                            },
                            android: {
                                priority: "high",
                                notification: {
                                    channel_id: "order_notifications_v2",
                                    sound: "notify"
                                }
                            },
                            apns: {
                                payload: {
                                    aps: {
                                        sound: 'notify.wav'
                                    }
                                }
                            }
                        }
                    };

                    try {
                        const responseJson = await fetch('https://fcm.googleapis.com/v1/projects/arryt-b201e/messages:send', {
                            method: 'POST',
                            body: JSON.stringify(message),
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${accessToken}`,
                            }
                        });

                        const response = await responseJson.json();
                        console.log('response', response);
                        return true;
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }
}