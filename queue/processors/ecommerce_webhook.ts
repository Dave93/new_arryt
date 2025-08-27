import { CacheControlService } from "@api/src/modules/cache/service";
import { DB } from "@api/src/lib/db";
import Redis from "ioredis";
import { users } from "@api/drizzle/schema";
import { eq } from "drizzle-orm";

type ecommerceWebhookData = {
    id: string;
    order_number: string;
    organization_id: string;
    terminal_id: string;
    delivery_pricing_id: string | null;
    orders_organization: {
        name: string;
        active: boolean;
        id: string;
        external_id: string | null;
        support_chat_url: string | null;
        icon_url: string | null;
    } | null;
    orders_customers: {
        name: string;
        id: string;
        phone: string;
    } | null;
    orders_order_status: {
        name: string;
        id: string;
        finish: boolean;
        cancel: boolean;
        in_terminal: boolean;
        on_way: boolean;
    } | null;
    orders_terminals: {
        name: string;
        id: string;
    } | null;
    created_at: string;
    to_lat: number;
    to_lon: number;
    from_lat: number;
    from_lon: number;
    pre_distance: number;
    delivery_comment: string | null;
    delivery_address: string;
    delivery_price: number;
    order_price: number;
    courier_id: string | null;
    payment_type: string;
    customer_delivery_price: number;
    additional_phone: string | null;
    house: string | null;
    entrance: string | null;
    flat: string | null;
    order_status_id: string;
}

export default async function processEcommerceWebhook(redis: Redis, db: DB, cacheControl: CacheControlService, data: ecommerceWebhookData) {
    console.log('working on ecommerce webhook');
    console.log(data);
    if (!data.courier_id) {
        return;
    }

    const organization = await cacheControl.getOrganization(data.organization_id);

    // Temporarely checking for lesailes
    if (!organization.webhook?.includes('lesailes.uz')) {
        return;
    }

    if (!organization) {
        return;
    }

    const orderStatuses = await cacheControl.getOrderStatuses();
    const organizationOrderStatuses = orderStatuses.filter(status => status.organization_id == data.organization_id);
    const currentOrderStatus = organizationOrderStatuses.find(status => status.id == data.order_status_id);
    if (!currentOrderStatus) {
        return;
    }

    if (currentOrderStatus.finish || currentOrderStatus.cancel) {
        return;
    }

    const courier = await db.select({
        id: users.id,
        first_name: users.first_name,
        last_name: users.last_name,
        phone: users.phone,
    }).from(users).where(eq(users.id, data.courier_id!)).execute();

    if (!courier) {
        return;
    }

    const response = await fetch(`${organization.webhook}`, {
        method: 'POST',
        body: JSON.stringify({
            order: {
                id: data.id,
            },
            log: {
                action: currentOrderStatus.code,
                text: currentOrderStatus.status_change_text,
            },
            courier: courier[0],
        }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer okq1jkderwpdybsv6mjb5ctc35xpwz95h`,
        },
    });

    let responseData = await response.text();
    console.log('webhook response', responseData);
}