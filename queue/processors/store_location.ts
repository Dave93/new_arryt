import { DB } from "@api/src/lib/db";
import { and, desc, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { order_actions, order_locations, orders, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";
import { getDistance } from "geolib";
import dayjs from "dayjs";

type storeLocationData = {
    lat: string;
    lon: string;
    user_id: string;
    app_version: string;
};

export default async function processStoreLocation(redis: Redis, db: DB, cacheControl: CacheControlService, data: storeLocationData) {
    try {
        // console.log('store location data', data);
        console.time('store_location');
        console.log('store location data', data);
        const orderStatuses = await cacheControl.getOrderStatuses();

        const terminalsList = await cacheControl.getTerminals();
        try {
            // console.log('key', `${process.env.PROJECT_PREFIX}_user_location`)
            await redis.hset(`${process.env.PROJECT_PREFIX}_user_location`, data.user_id, JSON.stringify({
                user_id: data.user_id,
                lat: data.lat,
                lon: data.lon,
                app_version: data.app_version,
            }));
        } catch (e) {
            console.log('redis error', e);
        }
        const orderStatusesNotOnWay = orderStatuses.filter((status) => status.in_terminal);
        // console.log('store location line', 22);


        const ordersNotOnWay = await db.select({
            id: orders.id,
            terminal_id: orders.terminal_id,
            created_at: orders.created_at,
            organization_id: orders.organization_id,
            order_number: orders.order_number,
        }).from(orders).where(
            and(
                inArray(orders.order_status_id, orderStatusesNotOnWay.map((status) => status.id)),
                eq(orders.courier_id, data.user_id),
                gte(orders.created_at, dayjs().subtract(5, 'day').toISOString()),
                lte(orders.created_at, dayjs().toISOString())
            )
        ).execute();
        // console.log('store location line', 36);
        for (const order of ordersNotOnWay) {

            // console.log('store location line', 39);
            const terminal = terminalsList.find((terminal) => terminal.id === order.terminal_id);
            const distance = await getDistance(
                { latitude: terminal!.latitude, longitude: terminal!.longitude },
                { latitude: data.lat, longitude: data.lon },
            );
            console.log('store location line', 45);
            console.log('distance', distance);
            console.log('order number', order.order_number);
            if (distance >= 200) {
                await db.update(orders).set({
                    order_status_id: orderStatuses.find((status) => status.on_way && status.organization_id == order.organization_id)!.id,
                }).where(
                    and(
                        eq(orders.id, order.id),
                        gte(orders.created_at, dayjs().subtract(5, 'day').toISOString()),
                        lte(orders.created_at, dayjs().toISOString())
                    )
                ).execute();
            }
            // console.log('store location line', 57);
        }

        // console.log('store location line', 60);
        const orderStatusesThatNeedLocation = orderStatuses.filter(
            (orderStatus) => orderStatus.need_location && !orderStatus.finish,
        );

        // console.log('store location line', 61);

        const ordersThatNeedLocation = await db.select({
            id: orders.id,
            terminal_id: orders.terminal_id,
            created_at: orders.created_at,
            organization_id: orders.organization_id,
            order_status_id: orders.order_status_id,
        }).from(orders).where(
            and(
                inArray(orders.order_status_id, orderStatusesThatNeedLocation.map((status) => status.id)),
                eq(orders.courier_id, data.user_id),
                gte(orders.created_at, dayjs().subtract(7, 'day').toISOString()),
                lte(orders.created_at, dayjs().toISOString())
            )
        ).execute();
        // console.log('store location line', 81);
        let orderLocations = [];
        for (const order of ordersThatNeedLocation) {
            // console.log('needLocation insert', {
            //     order_id: order.id,
            //     order_created_at: order.created_at,
            //     terminal_id: order.terminal_id,
            //     courier_id: data.user_id,
            //     order_status_id: order.order_status_id,
            //     lat: +data.lat,
            //     lon: +data.lon,
            //     created_by: data.user_id,
            // })
            orderLocations.push({
                order_id: order.id,
                order_created_at: order.created_at,
                terminal_id: order.terminal_id,
                courier_id: data.user_id,
                order_status_id: order.order_status_id,
                lat: +data.lat,
                lon: +data.lon,
                created_by: data.user_id,
            })
            // await db.insert(order_locations).values({
            //     order_id: order.id,
            //     order_created_at: order.created_at,
            //     terminal_id: order.terminal_id,
            //     courier_id: data.user_id,
            //     order_status_id: order.order_status_id,
            //     lat: data.lat,
            //     lon: data.lon,
            //     created_by: data.user_id,
            // }).execute();
        }

        if (orderLocations.length > 0) {
            await db.insert(order_locations).values(orderLocations).execute();
        }

        const orderStatusesThatNeedLocationAndFinished = orderStatuses.filter(
            (orderStatus) => orderStatus.need_location && orderStatus.finish,
        );

        const finishedOrders = await db.select({
            id: orders.id,
            terminal_id: orders.terminal_id,
            created_at: orders.created_at,
            organization_id: orders.organization_id,
            order_status_id: orders.order_status_id,
        }).from(orders).where(
            and(
                inArray(orders.order_status_id, orderStatusesThatNeedLocationAndFinished.map((status) => status.id)),
                eq(orders.courier_id, data.user_id),
                gte(orders.created_at, sql`now() - interval '1 day'`),
                lte(orders.created_at, sql`now()`)
            )
        ).execute();
        if (finishedOrders.length > 0) {
            const orderLocations = await db.select().from(order_locations).where(
                and(
                    eq(order_locations.courier_id, data.user_id),
                    inArray(order_locations.order_id, finishedOrders.map((order) => order.id)),
                    gte(order_locations.order_created_at, sql`now() - interval '1 day'`),
                    lte(order_locations.order_created_at, sql`now()`)
                )
            ).execute();

            const registerOrderLocationsOrderId = orderLocations.map(
                (orderLocation) => orderLocation.order_id,
            );
            if (finishedOrders.filter((location) => !registerOrderLocationsOrderId.includes(location.id)).length > 0) {
                for (const order of finishedOrders) {
                    await db.insert(order_locations).values({
                        order_id: order.id,
                        order_created_at: order.created_at,
                        terminal_id: order.terminal_id,
                        courier_id: data.user_id,
                        order_status_id: order.order_status_id,
                        lat: data.lat,
                        lon: data.lon,
                        created_by: data.user_id,
                    }).execute();
                }
            }
        }

        console.timeEnd('store_location');
    } catch (error) {
        console.error('processStoreLocation', error);
    }

}