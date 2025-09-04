import { delivery_pricing, manager_withdraw, order_locations, order_status, orders, users } from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { getMinutes, getMinutesNow } from "../../lib/dates";
import dayjs from "dayjs";
import { InferSelectModel, and, desc, eq, gte, lte, sum, inArray } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { max, set, sort } from "radash";
import { DeliveryPricingRulesDto } from "../delivery_pricing/dto/rules.dto";

export const externalControler = new Elysia({
    name: "@app/external",
})
    .use(contextWitUser)
    .post("/api/external/set-score", async ({ body: { courier, order_id }, request: {
        headers
    }, redis, cacheControl, drizzle, error }) => {
        const token = headers.get("authorization")?.split(" ")[1] ?? null;

        const apiTokenJson = await redis.get(
            `${process.env.PROJECT_PREFIX}_api_tokens`
        );

        try {
            const apiTokens = JSON.parse(apiTokenJson || "[]");
            const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
            if (!apiToken) {

                return error(403, { error: `Forbidden` });
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

            return error(403, { error: `Forbidden` });
        }
    }, {
        body: t.Object({
            courier: t.Number(),
            order_id: t.Number(),
        })
    })
    .post("/api/external/change-location", async ({ body: { order_id, lat, lon }, set, request: {
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
                            const currentTime = new Date();
                            const now = getMinutesNow();
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
                                    const rules = d.rules as DeliveryPricingRulesDto[];
                                    const maxDistance: any = max(rules, (i: any) => +i.to);
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
                        const minDeliveryPricingRules = minDeliveryPricing!.rules as DeliveryPricingRulesDto[] | undefined;
                        if (minDeliveryPricingRules) {
                            minDeliveryPricingRules.forEach((r: any) => {
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
                        // console.log('location change update data', {
                        //     delivery_price: onWay ? order[0].delivery_price + price : price,
                        //     pre_distance: onWay ? order[0].pre_distance + minDistance : minDistance,
                        //     pre_duration: onWay ? Math.round(order[0].pre_duration + minDuration) : Math.round(minDuration),
                        //     to_lat: +lat,
                        //     to_lon: +lon,
                        //     delivery_pricing_id: minDeliveryPricing!.id,
                        //     wrong_lat: onWay ? order[0].to_lat : undefined,
                        //     wrong_lon: onWay ? order[0].to_lon : undefined,
                        // });
                        // console.log('location change update order', order[0]);
                        await drizzle.update(orders).set({
                            delivery_price: onWay ? order[0].delivery_price + price : price,
                            pre_distance: onWay ? order[0].pre_distance + minDistance : minDistance,
                            pre_duration: onWay ? Math.round(order[0].pre_duration + minDuration) : Math.round(minDuration),
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
            console.log('error', e);
            return { error: `Forbidden`, stack: e };
        }
    }, {
        body: t.Object({
            order_id: t.Number(),
            lat: t.Number(),
            lon: t.Number(),
        })
    })
    .post("/api/external/change-terminal", async ({ body: { order_id, terminal_id }, set, request: {
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
                        gte(orders.created_at, dayjs().subtract(15, 'day').toISOString())
                    )).limit(1).execute();

                    if (order.length > 0) {
                        const terminalsList = await cacheControl.getTerminals();
                        const terminal = terminalsList.find((terminal) => terminal.external_id === terminal_id);
                        if (!terminal) {
                            set.status = 403;

                            return { error: `Terminal not found` };
                        }
                        const deliveryPricing = await cacheControl.getOrganizationDeliveryPricing(currentOrganization.id);

                        let onWay = false;

                        const orderStatuses = await cacheControl.getOrderStatuses();
                        const organizationStatuses = orderStatuses.filter((orderStatus) => orderStatus.organization_id === currentOrganization.id);

                        const sortedOrderStatuses = sort(organizationStatuses, (i) => +i.sort);
                        const firstOrderStatus = sortedOrderStatuses[1];

                        const currentDay = new Date().getDay() == 0 ? 7 : new Date().getDay();
                        const currentTime = new Date().getHours();
                        const activeDeliveryPricing = deliveryPricing.filter((d) => {
                            let res = false;
                            const currentTime = new Date();
                            const now = getMinutesNow();
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

                        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.min_price!, true);


                        const terminalDeliveryPricing = activeDeliveryPricing.filter((d) => d.terminal_id === terminal.id);
                        let terminalDeliveryPricingSorted = sort(terminalDeliveryPricing, (i) => +i.default);
                        terminalDeliveryPricingSorted = sort(terminalDeliveryPricingSorted, (i) => +i.price_per_km);
                        terminalDeliveryPricingSorted = sort(terminalDeliveryPricingSorted, (i) => +i.min_price!, true);
                        // console.log('terminalDeliveryPricingSorted', terminalDeliveryPricingSorted);
                        const otherDeliveryPricing = activeDeliveryPricing.filter((d) => d.terminal_id !== terminal.id);
                        let otherDeliveryPricingSorted = sort(otherDeliveryPricing, (i) => +i.default);
                        otherDeliveryPricingSorted = sort(otherDeliveryPricingSorted, (i) => +i.price_per_km);
                        otherDeliveryPricingSorted = sort(otherDeliveryPricingSorted, (i) => +i.min_price!, true);
                        // console.log('otherDeliveryPricingSorted', otherDeliveryPricingSorted);
                        activeDeliveryPricingSorted = [...terminalDeliveryPricingSorted, ...otherDeliveryPricingSorted];

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
                                    const rules = d.rules as DeliveryPricingRulesDto[];
                                    const maxDistance: any = max(rules, (i: any) => +i.to);
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
                        const minDeliveryPricingRules = minDeliveryPricing!.rules as DeliveryPricingRulesDto[] | undefined;
                        if (minDeliveryPricingRules) {
                            minDeliveryPricingRules.forEach((r: any) => {
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
    .post('/api/external/calculate-customer-price', async ({ body: { terminal_id, toLat, toLon, phone, price: priceToCalculate, source_type }, error, request: { headers }, cacheControl }) => {
        const token = headers.get('authorization')?.split(' ')[1] ?? null;

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
        if (!apiToken) {
            return error(403, { error: `Forbidden` });
        }

        const terminals = await cacheControl.getTerminals();

        const terminal = terminals.find((t) => t.external_id === terminal_id);

        if (!terminal) {
            return error(403, { error: `Terminal not found` });
        }
        const organizations = await cacheControl.getOrganization(terminal.organization_id);

        const deliveryPricing = await cacheControl.getOrganizationDeliveryPricing(organizations.id);

        const currentDay = new Date().getDay() == 0 ? 7 : new Date().getDay();
        const currentTime = new Date().getHours();
        let activeDeliveryPricing = [];
        // console.log('deliveryPricing', deliveryPricing);
        activeDeliveryPricing = deliveryPricing.filter((d) => {
            let res = false;
            const currentTime = new Date();
            const now = getMinutesNow();
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
                d.active &&
                d.min_price! <= priceToCalculate
            ) {
                if (d.terminal_id === null) {
                    res = true;
                    if (d.source_type && d.source_type.length > 0 && source_type && source_type.length > 0) {
                        const sourceTypes = d.source_type.split(',').map((s) => s.trim());
                        if (sourceTypes.includes(source_type)) {
                            res = true;
                        } else {
                            res = false;
                        }
                    }
                } else if (d.terminal_id === terminal.id) {
                    res = true;
                    if (d.source_type && d.source_type.length > 0 && source_type && source_type.length > 0) {
                        const sourceTypes = d.source_type.split(',').map((s) => s.trim());
                        if (sourceTypes.includes(source_type)) {
                            res = true;
                        } else {
                            res = false;
                        }
                    }
                }


            }
            return res;
        });

        console.log('activeDeliveryPricing', JSON.stringify(activeDeliveryPricing));

        let activeDeliveryPricingSorted = sort(activeDeliveryPricing, (i) => +i.default);
        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.price_per_km);

        activeDeliveryPricingSorted = sort(activeDeliveryPricingSorted, (i) => +i.min_price!, true);


        const terminalDeliveryPricing = activeDeliveryPricing.filter((d) => d.terminal_id === terminal.id);
        let terminalDeliveryPricingSorted = sort(terminalDeliveryPricing, (i) => +i.default);
        terminalDeliveryPricingSorted = sort(terminalDeliveryPricingSorted, (i) => +i.price_per_km);
        terminalDeliveryPricingSorted = sort(terminalDeliveryPricingSorted, (i) => +i.min_price!, true);
        // console.log('terminalDeliveryPricingSorted', terminalDeliveryPricingSorted);
        const otherDeliveryPricing = activeDeliveryPricing.filter((d) => d.terminal_id !== terminal.id);
        let otherDeliveryPricingSorted = sort(otherDeliveryPricing, (i) => +i.default);
        otherDeliveryPricingSorted = sort(otherDeliveryPricingSorted, (i) => +i.price_per_km);
        otherDeliveryPricingSorted = sort(otherDeliveryPricingSorted, (i) => +i.min_price!, true);
        // console.log('otherDeliveryPricingSorted', otherDeliveryPricingSorted);
        activeDeliveryPricingSorted = [...terminalDeliveryPricingSorted, ...otherDeliveryPricingSorted];
        // console.log('activeDeliveryPricingSorted', activeDeliveryPricingSorted);

        let minDistance = 0;
        let minDuration = 0;
        let minDeliveryPricing = null;
        // if (terminal_id == '24448fa6-63e0-46bf-953f-ba24af65e19e') {
        //     console.log('activeDeliveryPricingSorted before', activeDeliveryPricingSorted);
        // }
        if (activeDeliveryPricingSorted.length == 0) {
            return error(400, { error: `No active delivery pricing` });
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
        // if (terminal_id == '24448fa6-63e0-46bf-953f-ba24af65e19e') {
        //     console.log('activeDeliveryPricingSorted', activeDeliveryPricingSorted);
        // }
        for (const d of activeDeliveryPricingSorted) {
            if (d.drive_type == 'foot') {
                const responseJson = await fetch(
                    `http://localhost:5001/route/v1/driving/${terminal.longitude},${terminal.latitude};${actualLon},${actualLat}?steps=true&overview=false`
                );
                const data = await responseJson.json();
                if (d.price_per_km == 0 && d.rules) {
                    const rules = d.rules as DeliveryPricingRulesDto[];
                    const maxDistance: any = max(rules, (i: any) => +i.to);
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


        let price = 0;
        minDistance = minDistance / 1000;
        let distance = minDistance;
        const customerRules = minDeliveryPricing!.customer_rules as DeliveryPricingRulesDto[] | undefined;
        if (customerRules) {
            customerRules.forEach((r: any) => {
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
            source_type: t.Optional(t.String()),
        })
    })
    .get('/api/external/track/:id', async ({ params: { id }, set, request: { headers }, cacheControl, drizzle, redis }) => {
        const token = headers.get('authorization')?.split(' ')[1] ?? null;

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
        if (!apiToken) {
            set.status = 403;

            return { error: `Forbidden` };
        }

        let orderData: {
            order_id: string;
            created_at: string;
        } | null = null;

        try {
            let lesTrackOrder = await redis.get(`les_track_order_${id}`);
            if (lesTrackOrder) {
                orderData = JSON.parse(lesTrackOrder);
            }
        } catch (e) {
        }

        try {
            let choparTrackOrder = await redis.get(`chopar_track_order_${id}`);
            if (choparTrackOrder) {
                orderData = JSON.parse(choparTrackOrder);
            }
        } catch (e) {
        }

        if (!orderData) {
            return {
                success: false,
                error_code: 'ORDER_NOT_FOUND',
                message: 'Order not found',
            };
        }

        const order = await drizzle.select({
            id: orders.id,
            courier_id: orders.courier_id,
            created_at: orders.created_at,
            order_status_id: orders.order_status_id,
            order_number: orders.order_number,
            from_location_lat: orders.from_lat,
            from_location_lon: orders.from_lon,
            to_location_lat: orders.to_lat,
            to_location_lon: orders.to_lon,
            last_name: users.last_name,
            first_name: users.first_name,
            phone: users.phone,
            drive_type: users.drive_type
        }).from(orders).where(and(
            eq(orders.id, orderData.order_id),
            gte(orders.created_at, orderData.created_at),
        ))
            .leftJoin(users, eq(orders.courier_id, users.id))
            .limit(1).execute();


        const currentOrder = order[0];

        if (!currentOrder) {
            return {
                success: false,
                error_code: 'ORDER_NOT_FOUND',
                message: 'Order not found',
            };
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
                error_code: 'LOCATION_NOT_ALLOWED_FOR_STATUS',
                message: 'Location not allowed for status',
            };
        }

        const locations = await drizzle.select({
            id: order_locations.id,
            created_at: order_locations.created_at,
            lat: order_locations.lat,
            lon: order_locations.lon,
            order_created_at: order_locations.order_created_at,
        }).from(order_locations).where(and(
            eq(order_locations.order_id, orderData.order_id),
            eq(order_locations.order_created_at, currentOrder.created_at),
        ))
        .orderBy(desc(order_locations.created_at))
        .limit(1)
        .execute();
        const res: any = {
            success: true,
            data: [],
        };
        if (currentOrder.last_name) {
            res.courier = {
                last_name: currentOrder.last_name,
                first_name: currentOrder.first_name,
                phone: currentOrder.phone,
                drive_type: currentOrder.drive_type,
            };
        }

        res.from_location = {
            lat: currentOrder.from_location_lat,
            lon: currentOrder.from_location_lon,
        };
        res.to_location = {
            lat: currentOrder.to_location_lat,
            lon: currentOrder.to_location_lon,
        };

        if (locations.length) {
            let data = locations.map((l) => {
                return {
                    latitude: l.lat,
                    longitude: l.lon,
                    created_at: l.created_at,
                };
            });
            res.data = data;
        }

        return res;
    }, {
        params: t.Object({
            id: t.String(),
        })
    })
    .get('/api/external/cooked_time/:id', async ({ params: { id }, set, cacheControl, request: { headers }, drizzle, query: { date, picked_up_time }, queues: {
        processSendNotificationQueue
    } }) => {
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
            eq(orders.order_number, id),
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
            picked_up_time: picked_up_time ? dayjs(picked_up_time).toISOString() : null,
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
            picked_up_time: t.Optional(t.String()),
        }),
    })
    .post('/api/external/yandex-callback', async ({ body, queues: {
        processYandexCallbackQueue
    } }) => {
        console.log('body', body);
        if (body?.claim_id) {
            await processYandexCallbackQueue.add(`${body.claim_id}_${(new Date()).getTime()}`, body, {
                attempts: 3, removeOnComplete: true,
            });

        }

        return {
            success: true,
        };
    }, {
        body: t.Object({
            claim_id: t.Optional(t.String()),
        }),
    })
    .post('/api/external/cancel-order', async ({ body, set, request: { headers }, drizzle, cacheControl }) => {
        console.log('body', body);

        const token = headers.get('authorization')?.split(' ')[1] ?? null;

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
        if (!apiToken) {
            set.status = 403;

            return { error: `Forbidden` };
        }

        const organizations = await cacheControl.getOrganization(apiToken.organization_id);

        const statuses = await cacheControl.getOrderStatuses();
        const organizationStatuses = statuses.filter((s) => s.organization_id === organizations.id);
        const canceledStatus = organizationStatuses.find((s) => s.cancel);

        if (!canceledStatus) {
            set.status = 400;

            return { error: `Canceled status not found` };
        }

        const order = await drizzle.select({
            id: orders.id,
        }).from(orders).where(and(
            eq(orders.order_number, body.order_id),
            eq(orders.organization_id, organizations.id),
        )).execute();

        if (order.length == 0) {
            set.status = 404;

            return { error: `Order not found` };
        }

        await drizzle.update(orders).set({
            order_status_id: canceledStatus.id,
        }).where(and(
            eq(orders.id, order[0].id)
        )).execute();

        return {
            success: true,
        };
    }, {
        body: t.Object({
            order_id: t.String(),
        }),
    })
    .post('/api/external/terminal-period-withdraws', async ({ body: { terminal_id, date_from, date_to }, error, request: { headers }, drizzle, cacheControl }) => {

        const token = headers.get('authorization')?.split(' ')[1] ?? null;

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken: any) => apiToken.token === token && apiToken.active);
        if (!apiToken) {
            return error(403, 'Forbidden');
        }

        const organization = await cacheControl.getOrganization(apiToken.organization_id);

        const terminals = await cacheControl.getTerminals();
        const terminal = terminals.find((t) => t.external_id === terminal_id && t.organization_id === organization.id);


        if (!terminal) {
            return error(404, 'Terminal not found');
        }

        let result: {
            withdraws: {
                amount: number;
                first_name: string;
                last_name: string;
            }[];
            customerPrice: number;
        } = {
            withdraws: [],
            customerPrice: 0
        }

        const withdraws = await drizzle
            .select({
                amount: sum(manager_withdraw.amount),
                first_name: users.first_name,
                last_name: users.last_name,
            })
            .from(manager_withdraw)
            .leftJoin(users, eq(manager_withdraw.courier_id, users.id))
            .where(and(
                eq(manager_withdraw.terminal_id, terminal.id),
                gte(manager_withdraw.created_at, date_from),
                lte(manager_withdraw.created_at, date_to),
            ))
            .groupBy(manager_withdraw.courier_id, manager_withdraw.terminal_id, users.first_name, users.last_name)
            .execute();

        result.withdraws = withdraws.map((w) => ({
            amount: w.amount ? +w.amount : 0,
            first_name: w.first_name ?? '',
            last_name: w.last_name ?? '',
        }));


        const yandexCourier = await drizzle.query.users.findFirst({
            where: eq(users.phone, '+998908251218'),
            columns: {
                id: true,
            },
        });

        if (yandexCourier) {

            const orderStatuses = await cacheControl.getOrderStatuses();

            const finishedStatusIds = orderStatuses
                .filter((s) => s.organization_id === organization.id && s.finish)
                .map((s) => s.id);

            const ordersList = await drizzle.select({
                customer_delivery_price: sum(orders.customer_delivery_price),
            })
                .from(orders)
                .where(and(
                    eq(orders.courier_id, yandexCourier.id),
                    eq(orders.terminal_id, terminal.id),
                    inArray(orders.order_status_id, finishedStatusIds),
                    gte(orders.created_at, date_from),
                    lte(orders.created_at, date_to),
                ))
                .groupBy(orders.courier_id)
                .execute();

            console.log('orders', ordersList);

            result.customerPrice = ordersList[0].customer_delivery_price ? +ordersList[0].customer_delivery_price : 0;
        }

        return result;
    }, {
        body: t.Object({
            terminal_id: t.String(),
            date_from: t.String(),
            date_to: t.String(),
        })
    })
