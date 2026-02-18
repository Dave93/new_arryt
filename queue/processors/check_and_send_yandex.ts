import { customers, order_items, orders, terminals, users } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { SearchService } from "@api/src/services/search/service";
import { getSetting } from "@api/src/utils/settings";
import { Queue } from "bullmq";
import { sleep, sleepSync } from "bun";
import { eq, getTableColumns } from "drizzle-orm";
import Redis from "ioredis/built/Redis";

export default async function processCheckAndSendYandex(db: DB, redis: Redis, cacheControl: CacheControlService, orderId: string) {
    const orderStatuses = await cacheControl.getOrderStatuses();

    const newOrders = await db.select({
        ...getTableColumns(orders),
        orders_terminals: getTableColumns(terminals),
        orders_customers: getTableColumns(customers),
    })
        .from(orders)
        .leftJoin(terminals, eq(terminals.id, orders.terminal_id))
        .leftJoin(customers, eq(customers.id, orders.customer_id))
        .where(eq(
            orders.id, orderId
        ));

    const order = newOrders[0];
    console.log('order', order);


    const newStatus = orderStatuses.find(status => status.sort == 1 && status.organization_id == order.organization_id);
    const nextStatus = orderStatuses.find(status => status.sort == 2 && status.organization_id == order.organization_id);
    console.log('newStatus', newStatus);
    if (!order.courier_id && order.order_status_id == newStatus!.id) {
        console.log('order.order_status_id', order.order_status_id);
        console.log('newStatus!.id', newStatus!.id);
        const yandexSenderName = await getSetting(redis, 'yandex_sender_name');
        const yandexSenderPhone = await getSetting(redis, 'yandex_sender_phone');

        let orderPrice = 0;
        if (order.payment_type == 'Наличными') {
            orderPrice += +order.order_price;
        }
        if (orderId == '1179932') {
            console.log('orderData', order);
        }
        
            orderPrice += +order.customer_delivery_price;

        const organization = await cacheControl.getOrganization(order.organization_id);

        let isClient = false;
        // get delivery pricing
        const deliveryPricing = await cacheControl.getDeliveryPricingById(order.delivery_pricing_id!);

        isClient = deliveryPricing.payment_type == "client";

        let comment = 'Savollar: +998 71 2050642 ';

        comment += `${organization.name} // sotib olish uchun naqd pul olib yuring / иметь с собой наличные для выкупа `;

        const orderPriceWithoutDelivery = orderPrice - (+order.customer_delivery_price);
        if (orderPriceWithoutDelivery > 0) {
            comment += `// цена ${new Intl.NumberFormat('ru').format(orderPriceWithoutDelivery)} сум`;
        }

        comment += `//ID: ${order.order_number}`;

        let clientComment = '';

        if (order.additional_phone) {
            comment += `// Mijozning qo'shimcha raqami: ${order.additional_phone}\n`;
            clientComment += ` ${order.additional_phone} Mijoz asosiy raqami bo'yicha javob berolmagan bo'lsa Qo'shimcha raqam. +998 71 2050642 Muammolar chiqgan bo'lsa yoki savollar paydo bo'lgan bo'lsa\n`;
        } else {
            clientComment += `  +998 99 444-90-06 Mijoz asosiy raqami bo'yicha javob berolmagan bo'lsa Qo'shimcha raqam. +998 71 2050642 Muammolar chiqgan bo'lsa yoki savollar paydo bo'lgan bo'lsa\n`;
        }

        comment += 'Savollar: +998 71 2050642';

        const expressTerminals = ['419b466b-a575-4e2f-b771-7206342bc242'];

        // generate 6 digit code
        const pinCode = Math.floor(100000 + Math.random() * 900000);

        const orderPriceLabel = new Intl.NumberFormat('ru').format(orderPrice);

        let cargo_options = ['thermobag'];
        // console.log('yandexSenderName', yandexSenderName);
        // console.log('yandexSenderPhone', yandexSenderPhone);
        // console.log('order!.orders_terminals!.manager_name', order!.orders_terminals!.manager_name);
        // console.log('order!.orders_terminals!.phone', order!.orders_terminals!.phone);
        // console.log('isClient', isClient);
        const yandexData = {
            auto_accept: true,
            callback_properties: {
                callback_url: `https://${process.env.API_DOMAIN}/api/external/yandex-callback`,
            },
            client_requirements: {
                cargo_options,
                door_to_door: true,
                taxi_class: expressTerminals.includes(order!.orders_terminals!.id) ? 'express' : 'courier',
            },
            emergency_contact: {
                name: yandexSenderName ? yandexSenderName : order!.orders_terminals!.manager_name,
                phone: yandexSenderPhone ? yandexSenderPhone : order!.orders_terminals!.phone,
            },
            items: [],
            route_points: [
                {
                    address: {
                        coordinates: [order!.orders_terminals!.longitude, order!.orders_terminals!.latitude],
                        fullname: order!.orders_terminals!.address,
                        comment: comment,
                    },
                    contact: {
                        name: (yandexSenderName ? yandexSenderName : order!.orders_terminals!.manager_name),
                        phone: (yandexSenderPhone ? yandexSenderPhone : order!.orders_terminals!.phone),
                    },
                    type: 'source',
                    // pickup_code: ['56fe54a9-ae37-49b7-8de7-62aadb2abd19', '972b7402-345d-400e-9bf2-b77691b0fcd9'].includes(
                    //   order.orders_terminals.id,
                    // )
                    //   ? pinCode.toString()
                    //   : null,
                    // skip_confirmation: !['56fe54a9-ae37-49b7-8de7-62aadb2abd19', '972b7402-345d-400e-9bf2-b77691b0fcd9'].includes(
                    //   order.orders_terminals.id,
                    // ),
                    ...(orderPrice > 0 && orderPrice <= 500000 ? {buyout: {
                        payment_method: 'cash'
                    }} : {}),
                    skip_confirmation: true,
                    visit_order: 1,
                    point_id: 1,
                },
                {
                    address: {
                        coordinates: [order.to_lon, order.to_lat],
                        fullname: order.delivery_address,
                        building: order.house,
                        porch: order.entrance,
                        flat: order.flat ? +order.flat : null,
                        comment: clientComment,
                    },
                    contact: {
                        name: order!.orders_customers!.name,
                        phone: order!.orders_customers!.phone,
                    },
                    // payment_on_delivery:
                    //     order.payment_type == 'Наличными' && orderPrice <= 500000
                    //     ? {
                    //         customer: {
                    //             phone: order!.orders_customers!.phone,
                    //         },
                    //         payment_method: 'cash',
                    //         }
                    //     : undefined,
                    ...(orderPrice > 0 && orderPrice <= 500000 ? {payment_on_delivery: {
                        customer: {
                            phone: order!.orders_customers!.phone,
                        },
                        payment_method: 'cash',
        }} : {}),
                    external_order_id: order.order_number,
                    point_id: 2,
                    skip_confirmation: true,
                    type: 'destination',
                    visit_order: 2,
                },
                {
                    address: {
                        coordinates: [order!.orders_terminals!.longitude, order!.orders_terminals!.latitude],
                        fullname: order!.orders_terminals!.address,
                        comment: comment,
                    },
                    contact: {
                        name: yandexSenderName ? yandexSenderName : order!.orders_terminals!.manager_name,
                        phone: yandexSenderPhone ? yandexSenderPhone : order!.orders_terminals!.phone,
                    },
                    type: 'return',
                    // pickup_code: ['56fe54a9-ae37-49b7-8de7-62aadb2abd19', '972b7402-345d-400e-9bf2-b77691b0fcd9'].includes(
                    //   order.orders_terminals.id,
                    // )
                    //   ? pinCode.toString()
                    //   : null,
                    // skip_confirmation: !['56fe54a9-ae37-49b7-8de7-62aadb2abd19', '972b7402-345d-400e-9bf2-b77691b0fcd9'].includes(
                    //   order.orders_terminals.id,
                    // ),
                    skip_confirmation: true,
                    visit_order: 3,
                    point_id: 3,
                },
            ],
            skip_client_notify: false,
            skip_door_to_door: false,
        };
        console.log('yandexData', JSON.stringify(yandexData));
        const items = await db.select().from(order_items).where(eq(order_items.order_id, order.id));
        items.forEach((item) => {
            // @ts-ignore
            yandexData.items.push({
                pickup_point: 1,
                dropoff_point: 2,
                cost_currency: 'UZS',
                cost_value: item.price.toString(),
                title: item.name,
                quantity: item.quantity,
                weight: 0,
                fiscalization:
                    orderPrice > 0 && orderPrice <= 500000
                        ? {
                            article: 'артикул',
                            supplier_inn: '1111111111',
                            vat_code_str: 'vat12',
                        }
                        : undefined,
            });
        });

        if (+order.customer_delivery_price > 0) {
            // @ts-ignore
            yandexData.items.push({
                pickup_point: 1,
                dropoff_point: 2,
                cost_currency: 'UZS',
                cost_value: order.customer_delivery_price.toString(),
                title: 'Доставка / Yetkazib berish',
                quantity: 1,
                weight: 0,
                fiscalization:
                    orderPrice > 0 && orderPrice <= 500000
                        ? {
                            article: 'доставка',
                            supplier_inn: '1111111111',
                            vat_code_str: 'vat12',
                        }
                        : undefined,
            });
        }

        const yandexUrl = `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/create?request_id=${order.id}`;

        const yandexReponse = await fetch(yandexUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'ru',
                Authorization: `Bearer ${process.env.YANDEX_DELIVERY_TOKEN}`,
            },
            body: JSON.stringify(yandexData),
        });
        // console.log('yandexReponse', await yandexReponse.json());
        const yandexJson = await yandexReponse.json();
        console.log('yandexJson', yandexJson);
        const yandexCourier = await db.select({
            id: users.id,
        }).from(users).where(eq(users.phone, '+998908251218'));

        // const davrUser = await db.select().from(users).where(eq(users.phone, '+998909514019'));
        await db.update(orders).set({
            courier_id: yandexCourier[0].id,
            order_status_id: nextStatus!.id,
            yandex_id: yandexJson.id,
        }).where(eq(orders.id, order.id));

        sleepSync(500);

        const approveUrl = `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/accept?claim_id=${yandexJson.id}`;
        try {
            const approveResponse = await fetch(approveUrl, {
                method: 'POST',
                body: JSON.stringify({
                    version: yandexJson.version,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': 'ru',
                    Authorization: `Bearer ${process.env.YANDEX_DELIVERY_TOKEN}`,
                },
            });

            const approveJson = await approveResponse.json();
            // console.log('approveJson', approveJson);
            // await searchService.indexYandexDeliveryOrder(order.id, {
            //     // @ts-ignore
            //     ...yandexJson,
            //     // @ts-ignore
            //     ...approveJson,
            // }, {}, davrUser[0]);
        } catch (e) {
            console.log('e', e);
        }

        // await processOrderIndex.add(order.id, {
        //     id: order.id,
        //     created_at: order.created_at,
        // }, {
        //     attempts: 3, removeOnComplete: true
        // });
    }
}