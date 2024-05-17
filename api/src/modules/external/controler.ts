import { delivery_pricing, order_status, orders } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { getMinutes } from "@api/src/lib/dates";
import dayjs from "dayjs";
import { InferSelectModel, and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { max, sort } from "radash";

export const externalControler = new Elysia({
    name: "@app/external",
})
    .use(ctx)
    .post("/external/set-score", async ({ body: { courier, order_id }, set, request: {
        headers
    }, redis, cacheControl, drizzle }) => {
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
                    const order = await drizzle.select({
                        id: orders.id,
                    }).from(orders).where(and(
                        eq(orders.order_number, order_id.toString()),
                        eq(orders.organization_id, currentOrganization.id),
                    )).limit(1).execute();

                    if (order.length > 0) {
                        await drizzle.update(orders).set({
                            score: courier
                        }).where(eq(orders.id, order[0].id)).execute();
                    }
                }

                return {
                    success: true,
                };
            }
        } catch (e) {
            set.status = 403;

            return { error: `Forbidden` };
        }
    }, {
        body: t.Object({
            courier: t.Number(),
            order_id: t.Number(),
        })
    })
    .post("/external/change-location", async ({ body: { order_id, lat, lon }, set, request: {
        headers
    }, redis, cacheControl, drizzle }) => {
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
                    const order = await drizzle.select({
                        id: orders.id,
                        delivery_pricing_id: orders.delivery_pricing_id,
                        terminal_id: orders.terminal_id,
                        delivery_price: orders.delivery_price,
                        pre_distance: orders.pre_distance,
                        pre_duration: orders.pre_duration,
                        to_lat: orders.to_lat,
                        to_lon: orders.to_lon,
                        order_status_id: orders.order_status_id,
                    }).from(orders).where(and(
                        eq(orders.order_number, order_id.toString()),
                        eq(orders.organization_id, currentOrganization.id),
                    )).limit(1).execute();

                    if (order.length > 0) {
                        const terminalsList = await cacheControl.getTerminals();
                        const terminal = terminalsList.find((terminal) => terminal.id === order[0].terminal_id);

                        const deliveryPricing = await cacheControl.getOrganizationDeliveryPricing(currentOrganization.id);

                        let onWay = false;

                        const orderStatuses = await cacheControl.getOrderStatuses();
                        const organizationStatuses = orderStatuses.filter((orderStatus) => orderStatus.organization_id === currentOrganization.id);
                        const currentStatus = orderStatuses.find((orderStatus) => orderStatus.id === order[0].order_status_id);

                        const onWayStatus = organizationStatuses.find((orderStatus) => orderStatus.on_way);

                        if (currentStatus!.sort >= onWayStatus!.sort) {
                            onWay = true;
                        }

                        const currentDay = new Date().getDay() == 0 ? 7 : new Date().getDay();
                        const currentTime = new Date().getHours();
                        const activeDeliveryPricing = deliveryPricing.filter((d) => {
                            let res = false;
                            const startTime = dayjs(d.start_time, 'HH:mm:ss').format('HH:mm');
                            const endTime = dayjs(d.end_time, 'HH:mm:ss').format('HH:mm');
                            const currentTime = new Date();
                            const now = getMinutes(d.start_time);
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
                                d.min_price! <= order[0].delivery_price
                            ) {
                                if (d.terminal_id === null) {
                                    res = true;
                                } else if (d.terminal_id === terminal!.id) {
                                    res = true;
                                }
                            }
                            return res;
                        });

                        let activeDeliveryPricingSorted = sort(activeDeliveryPricing, (i) => +i.default);
                        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.price_per_km);
                        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => i.min_price ? +i.min_price! : 0, true);

                        let minDistance = 0;
                        let minDuration = 0;
                        let minDeliveryPricing: InferSelectModel<typeof delivery_pricing> | null = null;

                        if (activeDeliveryPricingSorted.length == 0) {
                            set.status = 409;
                            return { error: `No active delivery pricing` };
                        }

                        const actualLat = +lat;
                        const actualLon = +lon;

                        for (const d of activeDeliveryPricingSorted) {
                            if (d.drive_type == 'foot') {
                                const responseJson = await fetch(
                                    `http://127.0.0.1:5001/route/v1/driving/${onWay ? order[0].to_lon : terminal!.longitude},${onWay ? order[0].to_lat : terminal!.latitude};${actualLon},${actualLat}?steps=true&overview=false`
                                );

                                const data = await responseJson.json();
                                if (d.price_per_km == 0 && d.rules) {
                                    const maxDistance: any = max(d.rules, (i: any) => +i.to);
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
                            } else {
                                const responseJson = await fetch(
                                    `http://127.0.0.1:5000/route/v1/driving/${onWay ? order[0].to_lon : terminal!.longitude},${onWay ? order[0].to_lat : terminal!.latitude};${actualLon},${actualLat}?steps=true&overview=false`
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
                            }
                        }


                        let price = 0;
                        minDistance = minDistance / 1000;
                        let distance = minDistance;
                        if (minDeliveryPricing?.rules) {
                            minDeliveryPricing!.rules!.forEach((r: any) => {
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
                            const pricePerKm =
                                Math.floor(distance) * minDeliveryPricing!.price_per_km;
                            price += pricePerKm + additional;
                        }

                        await drizzle.update(orders).set({
                            delivery_price: onWay ? order[0].delivery_price + price : price,
                            pre_distance: onWay ? order[0].pre_distance + minDistance : minDistance,
                            pre_duration: onWay ? order[0].pre_duration + minDuration : minDuration,
                            to_lat: +lat,
                            to_lon: +lon,
                            delivery_pricing_id: minDeliveryPricing!.id,
                            wrong_lat: onWay ? order[0].to_lat : undefined,
                            wrong_lon: onWay ? order[0].to_lon : undefined,
                        }).where(eq(orders.id, order[0].id)).execute();

                        return {
                            success: true,
                        };
                    }
                }

                return {
                    success: true,
                };
            }
        } catch (e) {
            set.status = 403;

            return { error: `Forbidden` };
        }
    }, {
        body: t.Object({
            order_id: t.Number(),
            lat: t.Number(),
            lon: t.Number(),
        })
    })
    .post("/external/change-terminal", async ({ body: { order_id, terminal_id }, set, request: {
        headers
    }, redis, cacheControl, drizzle }) => {
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
                    const order = await drizzle.select({
                        id: orders.id,
                        delivery_pricing_id: orders.delivery_pricing_id,
                        terminal_id: orders.terminal_id,
                        delivery_price: orders.delivery_price,
                        pre_distance: orders.pre_distance,
                        pre_duration: orders.pre_duration,
                        to_lat: orders.to_lat,
                        to_lon: orders.to_lon,
                        order_status_id: orders.order_status_id,
                    }).from(orders).where(and(
                        eq(orders.order_number, order_id.toString()),
                        eq(orders.organization_id, currentOrganization.id),
                    )).limit(1).execute();

                    if (order.length > 0) {
                        const terminalsList = await cacheControl.getTerminals();
                        const terminal = terminalsList.find((terminal) => terminal.id === terminal_id);

                        const deliveryPricing = await cacheControl.getOrganizationDeliveryPricing(currentOrganization.id);

                        let onWay = false;

                        const orderStatuses = await cacheControl.getOrderStatuses();
                        const organizationStatuses = orderStatuses.filter((orderStatus) => orderStatus.organization_id === currentOrganization.id);

                        const sortedOrderStatuses = sort(organizationStatuses, (i) => +i.sort);
                        const firstOrderStatus = sortedOrderStatuses[0];

                        const currentDay = new Date().getDay() == 0 ? 7 : new Date().getDay();
                        const currentTime = new Date().getHours();
                        const activeDeliveryPricing = deliveryPricing.filter((d) => {
                            let res = false;
                            const startTime = dayjs(d.start_time, 'HH:mm:ss').format('HH:mm');
                            const endTime = dayjs(d.end_time, 'HH:mm:ss').format('HH:mm');
                            const currentTime = new Date();
                            const now = getMinutes(d.start_time);
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
                                d.min_price! <= order[0].delivery_price
                            ) {
                                if (d.terminal_id === null) {
                                    res = true;
                                } else if (d.terminal_id === terminal!.id) {
                                    res = true;
                                }
                            }
                            return res;
                        });

                        let activeDeliveryPricingSorted = sort(activeDeliveryPricing, (i) => +i.default);
                        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.price_per_km);
                        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => i.min_price ? +i.min_price! : 0, true);

                        let minDistance = 0;
                        let minDuration = 0;
                        let minDeliveryPricing: InferSelectModel<typeof delivery_pricing> | null = null;

                        if (activeDeliveryPricingSorted.length == 0) {
                            set.status = 409;
                            return { error: `No active delivery pricing` };
                        }

                        const actualLat = +order[0].to_lat;
                        const actualLon = +order[0].to_lon;

                        for (const d of activeDeliveryPricingSorted) {
                            if (d.drive_type == 'foot') {
                                const responseJson = await fetch(
                                    `http://127.0.0.1:5001/route/v1/driving/${terminal!.longitude},${terminal!.latitude};${actualLon},${actualLat}?steps=true&overview=false`
                                );

                                const data = await responseJson.json();
                                if (d.price_per_km == 0 && d.rules) {
                                    const maxDistance: any = max(d.rules, (i: any) => +i.to);
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
                            } else {
                                const responseJson = await fetch(
                                    `http://127.0.0.1:5000/route/v1/driving/${terminal!.longitude},${terminal!.latitude};${actualLon},${actualLat}?steps=true&overview=false`
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
                            }
                        }


                        let price = 0;
                        minDistance = minDistance / 1000;
                        let distance = minDistance;
                        if (minDeliveryPricing?.rules) {
                            minDeliveryPricing!.rules!.forEach((r: any) => {
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
                            const pricePerKm =
                                Math.floor(distance) * minDeliveryPricing!.price_per_km;
                            price += pricePerKm + additional;
                        }

                        await drizzle.update(orders).set({
                            delivery_price: price,
                            pre_distance: minDistance,
                            pre_duration: Math.round(minDuration),
                            terminal_id: terminal!.id,
                            delivery_pricing_id: minDeliveryPricing!.id,
                            courier_id: null,
                            order_status_id: firstOrderStatus.id,
                        }).where(eq(orders.id, order[0].id)).execute();

                        return {
                            success: true,
                        };
                    }
                }

                return {
                    success: true,
                };
            }
        } catch (e) {
            set.status = 403;

            return { error: `Forbidden` };
        }
    }, {
        body: t.Object({
            order_id: t.Number(),
            terminal_id: t.String(),
        })
    })