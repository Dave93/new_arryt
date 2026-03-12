import { customers, order_items, orders, terminals, users } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { getSetting } from "@api/src/utils/settings";
import { eq, getTableColumns } from "drizzle-orm";
import Redis from "ioredis/built/Redis";

export default async function processCheckAndSendNoor(db: DB, redis: Redis, cacheControl: CacheControlService, orderId: string) {
    const orderStatuses = await cacheControl.getOrderStatuses();

    const newOrders = await db.select({
        ...getTableColumns(orders),
        orders_terminals: getTableColumns(terminals),
        orders_customers: getTableColumns(customers),
    })
        .from(orders)
        .leftJoin(terminals, eq(terminals.id, orders.terminal_id))
        .leftJoin(customers, eq(customers.id, orders.customer_id))
        .where(eq(orders.id, orderId));

    const order = newOrders[0];
    if (!order) {
        console.log(`[Noor] Order not found: ${orderId}`);
        return;
    }

    const newStatus = orderStatuses.find(status => status.sort == 1 && status.organization_id == order.organization_id);
    const nextStatus = orderStatuses.find(status => status.sort == 2 && status.organization_id == order.organization_id);

    if (!order.courier_id && order.order_status_id == newStatus!.id) {
        const senderName = "Koll-Sentr Les&Chopar";
        const senderPhone = "+998712050642";

        let orderPrice = 0;
        if (order.payment_type == 'Наличными') {
            orderPrice += +order.order_price;
        }
        orderPrice += +order.customer_delivery_price;

        const organization = await cacheControl.getOrganization(order.organization_id);

        let comment = `${organization.name} // ID: ${order.order_number}`;

        if (orderPrice > 0) {
            comment += ` // цена ${new Intl.NumberFormat('ru').format(orderPrice)} сум`;
        }

        comment += ' // Savollar: +998 71 2050642';

        if (order.additional_phone) {
            comment += ` // Qo'shimcha raqam: ${order.additional_phone}`;
        }

        let clientComment = order.delivery_comment || '';
        if (order.additional_phone) {
            clientComment += ` Qo'shimcha raqam: ${order.additional_phone}`;
        }

        // Build items array for Noor
        const items = await db.select().from(order_items).where(eq(order_items.order_id, order.id));
        const noorItems = items.map((item) => ({
            name: item.name,
            price_per_unit: Math.round(+item.price),
            quantity: item.quantity,
            weight: item.weight ? Math.round(+item.weight) : 0,
        }));

        // Add delivery fee as item if present
        if (+order.customer_delivery_price > 0) {
            noorItems.push({
                name: 'Доставка / Yetkazib berish',
                price_per_unit: Math.round(+order.customer_delivery_price),
                quantity: 1,
                weight: 0,
            });
        }

        const noorData = {
            vendor_order_id: order.order_number,
            origin: [
                {
                    location: {
                        lat: order!.orders_terminals!.latitude,
                        long: order!.orders_terminals!.longitude,
                    },
                    order: 1,
                    address: order!.orders_terminals!.address,
                    comment: comment,
                    client: {
                        phone: senderPhone,
                        name: senderName,
                    },
                    products: {
                        type_id: 1,
                        description: 'Еда',
                        items: noorItems,
                    },
                },
            ],
            destination: [
                {
                    location: {
                        lat: order.to_lat,
                        long: order.to_lon,
                    },
                    order: 2,
                    address: order.delivery_address,
                    entrance: order.entrance || '',
                    floor: 0,
                    apartment: order.flat || '',
                    comment: clientComment,
                    client: {
                        phone: order!.orders_customers!.phone,
                        name: order!.orders_customers!.name,
                    },
                    products: {
                        type_id: 1,
                        description: 'Еда',
                        items: noorItems,
                    },
                },
            ],
            payment_type: 'BALANCE',
            delivery: {
                type: 'EXPRESS',
                time: null,
                send_link: true,
                door_to_door: false,
                product_paid: order.payment_type !== 'Наличными',
                equipment_id: 1, // Скутер
            },
        };

        console.log(`[Noor] Creating order for id=${order.id}, order_number=${order.order_number}, vendor_order_id: ${order.id}`);
        console.log(`[Noor] Request body:`, JSON.stringify(noorData, null, 2));

        const noorUrl = `https://back.noor.uz/api/v1/orders`;

        const noorResponse = await fetch(noorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'ru',
                'X-Auth': process.env.NOOR_DELIVERY_TOKEN!,
            },
            body: JSON.stringify(noorData),
        });

        const noorResponseStatus = noorResponse.status;
        const noorResponseText = await noorResponse.text();
        console.log(`[Noor] Response status=${noorResponseStatus} for order_number=${order.order_number}`);
        console.log(`[Noor] Response body:`, noorResponseText);

        let noorJson: any;
        try {
            noorJson = JSON.parse(noorResponseText);
        } catch (e) {
            console.error(`[Noor] Failed to parse response for order_number=${order.order_number}:`, noorResponseText);
            return;
        }

        if (!noorJson.order || !noorJson.order.id) {
            console.error(`[Noor] Failed to create order_number=${order.order_number}:`, noorResponseText);
            return;
        }

        console.log(`[Noor] Order created: order_number=${order.order_number}, noor_id=${noorJson.order.id}, stage=${noorJson.stage}`);

        // Find Noor virtual courier
        const noorCourier = await db.select({
            id: users.id,
        }).from(users).where(eq(users.phone, '+998900000001'));

        if (!noorCourier.length) {
            console.error(`[Noor] Noor courier user not found (phone: +998900000001)`);
            return;
        }

        await db.update(orders).set({
            courier_id: noorCourier[0].id,
            order_status_id: nextStatus!.id,
            noor_id: noorJson.order.id.toString(),
        }).where(eq(orders.id, order.id));

        console.log(`[Noor] Order order_number=${order.order_number} (${order.id}) updated with noor_id=${noorJson.order.id}`);
    }
}
