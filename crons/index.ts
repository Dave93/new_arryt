import { Cron } from "croner";
import { getSetting } from "@api/src/utils/settings";
import { db } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import Redis from 'ioredis'
import { missed_orders, orders, roles, users, users_roles } from "@api/drizzle/schema";
import { and, inArray, isNull, lte, gte, eq, isNotNull } from "drizzle-orm";
import dayjs from "dayjs";


export const redisClient = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

const cacheControl = new CacheControlService(db, redisClient);

const operatorsStatement = db.select({
    id: users.id,
    fcm_token: users.fcm_token,
})
    .from(users)
    .leftJoin(users_roles, eq(users.id, users_roles.user_id))
    .leftJoin(roles, eq(users_roles.role_id, roles.id))
    .where(
        and(
            inArray(roles.code, ['operator', 'admin', 'super_admin']),
            isNotNull(users.fcm_token)
        )
    ).prepare('fcm_operators');

const job = Cron('0 */2 * * * *', {
    name: 'register_missed_orders'
}, async () => {
    const laterMinutes = await getSetting(redisClient, 'late_order_time');
    console.log('laterMinutes', laterMinutes);
    console.log('typeof laterMinutes', typeof laterMinutes);
    const terminals = await cacheControl.getTerminals();
    const activeTerminalIds = terminals.filter((terminal) => terminal.active).map(t => t.id);

    const ordersList = await db.select({
        id: orders.id,
        created_at: orders.created_at,
    }).from(orders).where(
        and(
            gte(orders.created_at, dayjs().subtract(2, 'hour').minute(0).second(0).format('YYYY-MM-DD HH:mm:ss')),
            lte(orders.created_at, dayjs().subtract(laterMinutes, 'minute').format('YYYY-MM-DD HH:mm:ss')),
            inArray(orders.terminal_id, activeTerminalIds),
            isNull(orders.courier_id)
        )
    );

    if (ordersList.length > 0) {

        // await db.insert(missed_orders).values(ordersList.map((order) => ({
        //     order_id: order.id,
        //     order_created_at: order.created_at,
        //     system_minutes_config: laterMinutes,
        // }))).execute();

        const orderStatuses = await cacheControl.getOrderStatuses();
        // order status where order = 1
        const newOrderStatuses = orderStatuses.filter((status) => status.sort == 1);

        // start of day using Date
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // end of day using Date
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const serverKey = process.env.FCM_SERVER_KEY;

        const operators = await operatorsStatement.execute();
        const message = {
            notification: {
                title: 'Курьеры не приняли заказы',
                body: `Курьеры не приняли ${ordersList.length} заказов`,
                data: {
                    url: `/orders?pageSize=200&current=1&sorter[0][field]=created_at&sorter[0][order]=desc&filters[0][field]=created_at&filters[0][operator]=gte&filters[0][value]=${startOfDay.toISOString()}&filters[1][field]=created_at&filters[1][operator]=lte&filters[1][value]=${endOfDay.toISOString()}&filters[2][field]=order_status_id&filters[2][operator]=in&filters[2][value][0]=${newOrderStatuses[0].id
                        }&filters[2][value][1]=${newOrderStatuses[1].id}`,
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
            to: '',
            content: {
                channelKey: 'new_order',
            },
        };

        let deviceIds = operators.map((user) => user.fcm_token);
        console.log('deviceIds', deviceIds)
        if (deviceIds.length > 0) {
            for (const deviceId of deviceIds) {
                message.to = deviceId!;
                try {
                    const responseJson = await fetch('https://fcm.googleapis.com/fcm/send', {
                        method: 'POST',
                        body: JSON.stringify(message),
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `key=${serverKey}`,
                        }
                    });

                    const response = await responseJson.json();
                    console.log('response', response);
                    return {
                        // @ts-ignore
                        failureCount: response.failure,

                        // @ts-ignore
                        successCount: response.success,
                    };
                } catch (e) {
                    console.log(e);
                }
            }
        }
    }
});