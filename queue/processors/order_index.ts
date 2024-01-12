import { customers, order_status, orders, organization, terminals, users } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { SearchService } from "@api/src/services/search/service";
import { eq, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export default async function processOrderIndex(db: DB, searchService: SearchService, orderId: string) {
    const couriers = alias(users, "couriers");
    const orderFields = getTableColumns(orders);
    const order = await db.select({
        ...orderFields,
        order_couriers: {
            id: couriers.id,
            phone: couriers.phone,
            first_name: couriers.first_name,
            last_name: couriers.last_name,
            drive_type: couriers.drive_type,
            car_model: couriers.car_model,
            car_number: couriers.car_number,
            latitude: couriers.latitude,
            longitude: couriers.longitude,
        },
        orders_customers: {
            id: customers.id,
            phone: customers.phone,
            name: customers.name,
        },
        orders_orders_status: {
            id: order_status.id,
            name: order_status.name,
            cancel: order_status.cancel,
            finish: order_status.finish,
            waiting: order_status.waiting,
            on_way: order_status.on_way,
            in_terminal: order_status.in_terminal,
        },
        order_terminals: {
            id: terminals.id,
            name: terminals.name,
            active: terminals.active,
            address: terminals.address,
            external_id: terminals.external_id,
        },
        orders_organization: {
            id: organization.id,
            name: organization.name,
            active: organization.active,
            external_id: organization.external_id,
            support_chat_url: organization.support_chat_url,
        },
    }).from(orders).leftJoin(organization, eq(orders.organization_id, organization.id))
        .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
        .leftJoin(couriers, eq(orders.courier_id, couriers.id)).where(eq(orders.id, orderId)).execute();

    if (order && order.length > 0) {
        const orderData = order[0];
        // await searchService.indexOrder(orderData);
    }
}