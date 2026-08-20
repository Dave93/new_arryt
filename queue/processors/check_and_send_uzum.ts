import { customers, order_items, orders, terminals } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { getSetting } from "@api/src/utils/settings";
import { getUzumCourierId, UZUM_BASE_URL, uzumHeaders } from "@api/src/utils/uzum";
import { sleepSync } from "bun";
import { eq, getTableColumns } from "drizzle-orm";
import Redis from "ioredis/built/Redis";

export default async function processCheckAndSendUzum(db: DB, redis: Redis, cacheControl: CacheControlService, orderId: string, taxiClass?: string) {
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

    const newStatus = orderStatuses.find(status => status.sort == 1 && status.organization_id == order.organization_id);
    const nextStatus = orderStatuses.find(status => status.sort == 2 && status.organization_id == order.organization_id);
    if (!order.courier_id && order.order_status_id == newStatus!.id) {
        const uzumCourierId = await getUzumCourierId(cacheControl);
        if (!uzumCourierId) {
            console.log('[UZUM] ABORT: uzum_courier_id system config is missing, order untouched. order_id=', order.id);
            return;
        }

        const senderName = await getSetting(redis, 'yandex_sender_name');
        const senderPhone = await getSetting(redis, 'yandex_sender_phone');

        let orderPrice = 0;
        if (order.payment_type == 'Наличными') {
            orderPrice += +order.order_price;
        }
        orderPrice += +order.customer_delivery_price;

        const organization = await cacheControl.getOrganization(order.organization_id);

        let comment = 'Savollar: +998 71 2050642 ';

        comment += `${organization.name} // sotib olish uchun naqd pul olib yuring / иметь с собой наличные для выкупа `;

        if (orderPrice > 0) {
            comment += `// цена ${new Intl.NumberFormat('ru').format(orderPrice)} сум `;
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

        let cargo_options = ['thermobag'];
        const uzumData = {
            auto_accept: true,
            callback_properties: {
                callback_url: `https://${process.env.API_DOMAIN}/api/external/uzum-callback`,
            },
            client_requirements: {
                cargo_options,
                door_to_door: true,
                taxi_class: taxiClass || (expressTerminals.includes(order!.orders_terminals!.id) ? 'express' : 'courier'),
            },
            emergency_contact: {
                name: senderName ? senderName : order!.orders_terminals!.manager_name,
                phone: senderPhone ? senderPhone : order!.orders_terminals!.phone,
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
                        // Uzum shows this as the vendor name in the courier app, so it must
                        // be the branch, not the call-centre operator behind yandex_sender_name.
                        name: order!.orders_terminals!.name,
                        phone: (senderPhone ? senderPhone : order!.orders_terminals!.phone),
                    },
                    type: 'source',
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
                // Uzum rejects a Yandex-style 'return' third point:
                // 400 unsupported_points_count "more than 2 points not allowed"
            ],
            skip_client_notify: false,
            skip_door_to_door: false,
        };
        const items = await db.select().from(order_items).where(eq(order_items.order_id, order.id));
        items.forEach((item) => {
            // @ts-ignore
            uzumData.items.push({
                pickup_point: 1,
                dropoff_point: 2,
                cost_currency: 'UZS',
                cost_value: item.price.toString(),
                title: item.name,
                quantity: item.quantity,
                weight: item.weight ?? 0,
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
            uzumData.items.push({
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

        const createUrl = `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/create?request_id=${order.id}`;

        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: uzumHeaders(),
            body: JSON.stringify(uzumData),
        });
        const createJson: any = await createResponse.json().catch(() => ({}));

        if (!createResponse.ok || !createJson?.id) {
            console.log(`[UZUM] ABORT: claims/create failed, order untouched. order_id=${order.id}, http_status=${createResponse.status}, body=${JSON.stringify(createJson)}`);
            return;
        }

        await db.update(orders).set({
            courier_id: uzumCourierId,
            order_status_id: nextStatus!.id,
            uzum_id: createJson.id,
        }).where(eq(orders.id, order.id));

        sleepSync(500);

        const approveUrl = `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/accept?claim_id=${createJson.id}`;
        try {
            const approveResponse = await fetch(approveUrl, {
                method: 'POST',
                body: JSON.stringify({
                    version: createJson.version,
                }),
                headers: uzumHeaders(),
            });

            await approveResponse.json();
        } catch (e) {
            console.log('[UZUM] claims/accept failed', e);
        }
    }
}
