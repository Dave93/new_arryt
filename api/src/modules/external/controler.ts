import { delivery_pricing, order_locations, order_status, orders, users } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { getMinutes, getMinutesNow } from "@api/src/lib/dates";
import dayjs from "dayjs";
import { InferSelectModel, and, desc, eq } from "drizzle-orm";
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
    .post('/external/calculate-customer-price', async ({ body: { terminal_id, toLat, toLon, phone, price: priceToCalculate }, set, request: { headers }, cacheControl }) => {
        const token = headers.get('authorization')?.split(' ')[1] ?? null;

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
        if (!apiToken) {
            set.status = 403;

            return { error: `Forbidden` };
        }

        const terminals = await cacheControl.getTerminals();

        const terminal = terminals.find((t) => t.external_id === terminal_id);

        if (!terminal) {
            set.status = 403;

            return { error: `Terminal not found` };
        }
        const organizations = await cacheControl.getOrganization(terminal.organization_id);

        const deliveryPricing = await cacheControl.getOrganizationDeliveryPricing(organizations.id);

        const currentDay = new Date().getDay() == 0 ? 7 : new Date().getDay();
        const currentTime = new Date().getHours();
        let activeDeliveryPricing = [];
        activeDeliveryPricing = deliveryPricing.filter((d) => {
            let res = false;
            const startTime = dayjs.tz(d.start_time, 'Asia/Tashkent').add(5, 'hour').format('HH:mm');
            const endTime = dayjs.tz(d.end_time, 'Asia/Tashkent').add(5, 'hour').format('HH:mm');
            const currentTime = new Date();
            const now = getMinutesNow();
            let start = getMinutes(startTime);
            let end = getMinutes(endTime);

            if (end < start && now < start) {
                start -= getMinutes('24:00');
            } else if (start > end) end += getMinutes('24:00');

            const fullYear = currentTime.getFullYear();
            if (
                d.days?.includes(currentDay.toString()) &&
                now > start &&
                now < end &&
                d.active &&
                d.min_price! <= priceToCalculate
            ) {
                if (d.terminal_id === null) {
                    res = true;
                } else if (d.terminal_id === terminal.id) {
                    res = true;
                }
            }
            return res;
        });

        let activeDeliveryPricingSorted = sort(activeDeliveryPricing, (i) => +i.default);
        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.price_per_km);

        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.min_price!, true);

        let minDistance = 0;
        let minDuration = 0;
        let minDeliveryPricing = null;

        if (activeDeliveryPricingSorted.length == 0) {
            set.status = 400;
            return { error: `No active delivery pricing` };
        }

        const actualLat = toLat;
        const actualLon = toLon;
        // try {
        //   // get geocoding data via nominatim api
        //   const geocodingData = await axios.get(
        //     `https://nominatim.openstreetmap.org/search?q=${actualLat},${actualLon}&format=json&limit=1`,
        //   );
        //
        //   if (geocodingData.data.length > 0) {
        //     actualLat = geocodingData.data[0].lat;
        //     actualLon = geocodingData.data[0].lon;
        //   }
        // } catch (e) {}

        for (const d of activeDeliveryPricingSorted) {
            if (d.drive_type == 'foot') {
                const responseJson = await fetch(
                    `http://localhost:5001/route/v1/driving/${terminal.longitude},${terminal.latitude};${actualLon},${actualLat}?steps=true&overview=false`
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
                    `http://localhost:5000/route/v1/driving/${terminal.longitude},${terminal.latitude};${actualLon},${actualLat}?steps=true&overview=false`
                );
                const data = await responseJson.json();
                const tempDistance = data.routes[0].distance + 100; // add 100 meters

                const minDistanceKm = d.min_distance_km || 0;
                if (!minDeliveryPricing) {
                    minDistance = tempDistance;
                    minDuration = data.routes[0].duration;
                    if (tempDistance > minDistanceKm) {
                        minDeliveryPricing = d;
                    }
                }
                if (tempDistance < minDistance && tempDistance > d.min_distance_km) {
                    minDistance = tempDistance;
                    minDuration = data.routes[0].duration;
                    minDeliveryPricing = d;
                }
            }
        }

        if (!minDeliveryPricing && activeDeliveryPricingSorted.length > 0) {
            minDeliveryPricing = activeDeliveryPricingSorted[0];
        }

        console.log('minDeliveryPricing', minDeliveryPricing);
        console.log('minDistance', minDistance);

        let price = 0;
        minDistance = minDistance / 1000;
        let distance = minDistance;
        if (minDeliveryPricing!.customer_rules) {
            minDeliveryPricing!.customer_rules.forEach((r: any) => {
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
            const pricePerKm = Math.floor(distance) * minDeliveryPricing!.customer_price_per_km;
            price += pricePerKm + additional;
        }

        return {
            price,
            distance: minDistance,
        };
    }, {
        body: t.Object({
            terminal_id: t.String(),
            toLat: t.String(),
            toLon: t.String(),
            phone: t.Optional(t.String()),
            price: t.Number(),
        })
    })
    .get('/track/:id', async ({ params: { id }, set, request: { headers }, cacheControl, drizzle }) => {
        const token = headers.get('authorization')?.split(' ')[1] ?? null;

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
        if (!apiToken) {
            set.status = 403;

            return { error: `Forbidden` };
        }

        const order = await drizzle.select({
            id: orders.id,
            courier_id: orders.courier_id,
            created_at: orders.created_at,
            order_status_id: orders.order_status_id,
            order_number: orders.order_number,
            from_location: orders.from_lat,
            to_location: orders.from_lon,
            last_name: users.last_name,
            first_name: users.first_name,
            phone: users.phone,
        }).from(orders).where(and(
            eq(orders.id, id),
        ))
            .leftJoin(users, eq(orders.courier_id, users.id))
            .limit(1).execute();


        const currentOrder = order[0];

        if (!currentOrder) {
            set.status = 404;

            return { error: `Order not found` };
        }


        const yandexCourier = await cacheControl.getSetting('yandex_courier_id');

        // check if order is yandex courier
        try {
            const yandexCourierValue = JSON.parse(yandexCourier.value);
            const yandexCourierId = yandexCourierValue.value;
            if (currentOrder.courier_id == yandexCourierId) {
                return {
                    success: false,
                    message: 'yandex_courier_location',
                };
            }
        } catch (e) {
            console.log('yandexCourierError', e);
        }

        const orderStatuses = await cacheControl.getOrderStatuses();
        const currentOrderStatus = orderStatuses.filter((s) => s.id === currentOrder.order_status_id)[0];

        if (!currentOrderStatus.need_location) {
            return {
                success: false,
                message: 'location_not_allowed_for_status',
            };
        }

        const locations = await drizzle.select({
            id: order_locations.id,
            created_at: order_locations.created_at,
            lat: order_locations.lat,
            lon: order_locations.lon,
            order_created_at: order_locations.order_created_at,
        }).from(order_locations).where(and(
            eq(order_locations.order_id, id),
            eq(order_locations.order_created_at, currentOrder.created_at),
        )).orderBy(desc(order_locations.created_at)).execute();

        if (!locations.length) {
            return {
                success: true,
                data: [],
            };
        } else {
            let data = locations.map((l) => {
                return {
                    latitude: l.lat,
                    longitude: l.lon,
                    created_at: l.created_at,
                };
            });
            const res: any = {
                success: true,
                data: data,
            };

            if (currentOrder.last_name) {
                res.courier = {
                    last_name: currentOrder.last_name,
                    first_name: currentOrder.first_name,
                    phone: currentOrder.phone,
                };
            }

            res.from_location = currentOrder.from_location;
            res.to_location = currentOrder.to_location;

            return res;
        }
    }, {
        params: t.Object({
            id: t.String(),
        })
    })
    .get('/external/cooked_time/:id', async ({ params: { id }, set, cacheControl, request: { headers }, drizzle, query: { date }, processSendNotificationQueue }) => {
        const token = headers.get('authorization')?.split(' ')[1] ?? null;

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
        if (!apiToken) {
            set.status = 403;

            return { error: `Forbidden` };
        }

        const order = await drizzle.select({
            id: orders.id,
            courier_id: orders.courier_id,
            created_at: orders.created_at,
            order_status_id: orders.order_status_id,
            order_number: orders.order_number,
            from_location: orders.from_lat,
            to_location: orders.from_lon,
            last_name: users.last_name,
            first_name: users.first_name,
            phone: users.phone,
            pre_distance: orders.pre_distance,
            terminal_id: orders.terminal_id,
            delivery_schedule: orders.delivery_schedule,
        }).from(orders).where(and(
            eq(orders.id, id),
            eq(orders.organization_id, apiToken.organization_id!),
        ))
            .leftJoin(users, eq(orders.courier_id, users.id))
            .limit(1).execute();

        if (order.length == 0) {
            set.status = 404;

            return { error: `Order not found` };
        }

        const currentOrder = order[0];

        await drizzle.update(orders).set({
            cooked_time: dayjs(date).toISOString(),
        }).where(and(
            eq(orders.id, currentOrder.id),
            eq(orders.created_at, currentOrder.created_at),
        )).execute();


        // let yandexAllowedTerminals = ['96f31330-ed33-42fa-b84a-d28e595177b0', 'c61bc73d-6fd6-49e7-acb0-09cfc1863bad']; // Farxadskiy

        // if (yandexAllowedTerminals.includes(currentOrder.terminal_id) && currentOrder.pre_distance >= 2) {
        //     await this.checkAndSendYandex.add(
        //         'checkAndSendYandex',
        //         {
        //             id: currentOrder.id,
        //         },
        //         {
        //             attempts: 3,
        //             removeOnComplete: true,
        //             // delay to 15 minutes
        //             delay: 1000 * 60 * 3,
        //         },
        //     );
        // }

        // yandexAllowedTerminals = [
        //     '972b7402-345d-400e-9bf2-b77691b0fcd9',
        //     '56fe54a9-ae37-49b7-8de7-62aadb2abd19',
        //     '0ca018c8-22ff-40b4-bb0a-b4ba95068662',
        // ]; // Eko Park, C5 and Oybek

        // if (yandexAllowedTerminals.includes(currentOrder.terminal_id) && currentOrder.pre_distance > 1) {
        //     await this.checkAndSendYandex.add(
        //         'checkAndSendYandex',
        //         {
        //             id: currentOrder.id,
        //         },
        //         {
        //             attempts: 3,
        //             removeOnComplete: true,
        //             // delay to 15 minutes
        //             delay: 1000 * 60 * 3,
        //         },
        //     );
        // }

        // yandexAllowedTerminals = [
        //     // '36f7a844-8a72-40c2-a1c5-27dcdc8c2efd',
        //     'afec8909-5e34-45c8-8185-297bde69f263',
        // ]; // Yunusabad and Mega Planet

        // if (yandexAllowedTerminals.includes(currentOrder.terminal_id) && currentOrder.delivery_schedule != 'later') {
        //     await this.checkAndSendYandex.add(
        //         'checkAndSendYandex',
        //         {
        //             id: currentOrder.id,
        //         },
        //         {
        //             attempts: 3,
        //             removeOnComplete: true,
        //             // delay to 15 minutes
        //             delay: 1000 * 60 * 3,
        //         },
        //     );
        // }

        if (currentOrder.courier_id) {
            const user = await drizzle.query.users.findFirst({
                where: eq(users.id, currentOrder.courier_id),
                columns: {
                    fcm_token: true,
                    id: true,
                },
            });

            await processSendNotificationQueue.add(`${currentOrder.id}_${(new Date()).getTime()}`, {
                tokens: user!.fcm_token ? [user!.fcm_token] : [],
                payload: {
                    notification: {
                        title: 'Заказ готов',
                        body: `Заказ №${currentOrder.order_number} готов к выдаче. Доставьте его клиенту`,
                    },
                    data: {
                        order_id: currentOrder.id,
                        order_status_id: currentOrder.order_status_id,
                        terminal_id: currentOrder.terminal_id,
                    },
                    content: {
                        channelKey: 'cooking_ready',
                    },
                },
            });
        }

        return {
            success: true,
        };

    }, {
        params: t.Object({
            id: t.String(),
        }),
        query: t.Object({
            date: t.String(),
        }),
    })
    .post('/external/yandex-callback', async ({ body, set, processYandexCallbackQueue }) => {
        console.log('body', body);
        if (body?.claim_id) {
            await processYandexCallbackQueue.add(`${body.claim_id}_${(new Date()).getTime()}`, body, {
                attempts: 3, removeOnComplete: true,
            });

        }

        return {
            success: true,
        };
    })