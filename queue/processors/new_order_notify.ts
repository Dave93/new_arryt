import { DB } from "@api/src/lib/db";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
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

    const activeOrders = await db.select({
        courier_id: orders.courier_id,
        count: sql<number>`count(*) as count`,
    }).from(orders).where(
        and(
            eq(orders.terminal_id, order.terminal_id),
            inArray(orders.order_status_id, orderStatusesThatNeedNotification.map((status) => status.id)),
            isNotNull(orders.courier_id),
        ),
    ).groupBy(orders.courier_id).having(sql`count(*) < ${maxActiveOrderCount}`);

    const courierIds = activeOrders.map((o) => o.courier_id!);
    if (courierIds.length > 0) {

        const onlineUsers = await db.select({
            id: users.id,
            fcm_token: users.fcm_token,
        }).from(users).where(and(
            inArray(users.id, courierIds),
            eq(users.is_online, true),
        ));

        if (onlineUsers.length > 0) {
            const serverKey = process.env.FCM_SERVER_KEY!;
            const message = {
                notification: {
                    title: 'Поступил новый заказ',
                    body: `Новый заказ №${order.order_number} доступен для вас`,
                    data: {
                        order_id: order.id,
                        order_status_id: order.order_status_id,
                        terminal_id: order.terminal_id,
                        // actionButtons: [
                        //   {
                        //     key: 'REDIRECT',
                        //     label: 'Redirect',
                        //     // autoDismissible: true,
                        //   },
                        //   {
                        //     key: 'DISMISS',
                        //     label: 'Dismiss',
                        //     actionType: 'DismissAction',
                        //     isDangerousOption: true,
                        //     // autoDismissible: true,
                        //   },
                        // ],
                    },
                },
                // data: {
                //   title: payload.notification.title,
                //   body: payload.notification.body,
                //   ...payload.data,
                // },
                priority: 'high',
                android: {
                    priority: 'high',
                },
                mutable_content: true,
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        },
                    },
                },
                token: '',
                content: {
                    channelKey: 'new_order',
                },
            };

            let deviceIds = onlineUsers.map((user) => user.fcm_token).filter((deviceId) => deviceId !== null && deviceId !== undefined && deviceId !== '');
            console.log('deviceIds', deviceIds)

            const accessToken = await getFirebaseAccessToken();
            if (deviceIds.length > 0) {
                for (const deviceId of deviceIds) {
                    message.token = deviceId!;
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