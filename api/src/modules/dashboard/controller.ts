import Elysia, { t } from "elysia";
import { contextWitUser } from "../../context";
import { sql, and, gte, lte, eq, count, sum, avg } from 'drizzle-orm';
import { 
    orders, 
    users, 
    terminals, 
    order_status,
    customers,
    organization 
} from '../../../drizzle/schema';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const dashboardController = new Elysia({
    name: '@api/dashboard',
    prefix: '/api/dashboard'
})
    .use(contextWitUser)
    .get('/stats', async ({ drizzle, query }) => {
        const { start_date, end_date } = query;
        
        const startDate = start_date ? dayjs(start_date).startOf('day').toDate() : dayjs().startOf('day').toDate();
        const endDate = end_date ? dayjs(end_date).endOf('day').toDate() : dayjs().endOf('day').toDate();
        
        // Общее количество заказов за период
        const ordersCountResult = await drizzle
            .select({ count: count() })
            .from(orders)
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString())
            ));

        // Активные курьеры
        const activeCouriersResult = await drizzle
            .select({ count: count() })
            .from(users)
            .where(and(
                eq(users.is_online, true),
                users.drive_type ? sql`${users.drive_type} IS NOT NULL` : undefined
            ));

        // Средняя стоимость доставки за период
        const avgDeliveryPriceResult = await drizzle
            .select({ 
                avgPrice: avg(orders.delivery_price)
            })
            .from(orders)
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString())
            ));

        // Выручка за период
        const todayRevenueResult = await drizzle
            .select({ 
                totalRevenue: sum(orders.order_price)
            })
            .from(orders)
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString())
            ));

        return {
            totalOrders: ordersCountResult[0]?.count || 0,
            activeCouriers: activeCouriersResult[0]?.count || 0,
            avgDeliveryPrice: Number(avgDeliveryPriceResult[0]?.avgPrice || 0).toFixed(2),
            todayRevenue: Number(todayRevenueResult[0]?.totalRevenue || 0).toFixed(2)
        };
    }, {
        permission: 'orders.edit',
        query: t.Object({
            start_date: t.Optional(t.String()),
            end_date: t.Optional(t.String())
        })
    })
    .get('/recent-orders', async ({ drizzle, query }) => {
        const { limit = 10 } = query;
        
        const recentOrders = await drizzle
            .select({
                id: orders.id,
                orderNumber: orders.order_number,
                customerName: customers.name,
                customerPhone: customers.phone,
                courierFirstName: users.first_name,
                courierLastName: users.last_name,
                statusName: order_status.name,
                statusColor: order_status.color,
                orderPrice: orders.order_price,
                deliveryPrice: orders.delivery_price,
                createdAt: orders.created_at,
                deliveryAddress: orders.delivery_address
            })
            .from(orders)
            .leftJoin(customers, eq(orders.customer_id, customers.id))
            .leftJoin(users, eq(orders.courier_id, users.id))
            .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
            .orderBy(sql`${orders.created_at} DESC`)
            .limit(limit);

        return recentOrders;
    }, {
        permission: 'orders.list',
        query: t.Object({
            limit: t.Optional(t.Number({ default: 10 }))
        })
    })
    .get('/orders-by-status', async ({ drizzle, query }) => {
        const { start_date, end_date } = query;
        
        const startDate = start_date ? dayjs(start_date).startOf('day').toDate() : dayjs().startOf('day').toDate();
        const endDate = end_date ? dayjs(end_date).endOf('day').toDate() : dayjs().endOf('day').toDate();
        
        const ordersByStatus = await drizzle
            .select({
                statusName: order_status.name,
                statusColor: order_status.color,
                count: count()
            })
            .from(orders)
            .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString())
            ))
            .groupBy(order_status.id, order_status.name, order_status.color);

        return ordersByStatus;
    }, {
        permission: 'orders.edit',
        query: t.Object({
            start_date: t.Optional(t.String()),
            end_date: t.Optional(t.String())
        })
    })
    .get('/orders-by-status-and-org', async ({ drizzle, query }) => {
        const { start_date, end_date } = query;
        
        const startDate = start_date ? dayjs(start_date).startOf('day').toDate() : dayjs().startOf('day').toDate();
        const endDate = end_date ? dayjs(end_date).endOf('day').toDate() : dayjs().endOf('day').toDate();
        
        const ordersByStatusAndOrg = await drizzle
            .select({
                organizationId: organization.id,
                organizationName: organization.name,
                statusName: order_status.name,
                statusColor: order_status.color,
                count: count()
            })
            .from(orders)
            .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
            .leftJoin(organization, eq(orders.organization_id, organization.id))
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString())
            ))
            .groupBy(organization.id, organization.name, order_status.id, order_status.name, order_status.color);

        // Группируем данные по организациям
        const groupedData = ordersByStatusAndOrg.reduce((acc, item) => {
            const orgId = item.organizationId;
            if (orgId && !acc[orgId]) {
                acc[orgId] = {
                    organizationId: orgId,
                    organizationName: item.organizationName || 'Без организации',
                    statuses: []
                };
            }
            if (orgId && acc[orgId]) {
                acc[orgId].statuses.push({
                    statusName: item.statusName || 'Без статуса',
                    statusColor: item.statusColor || '#808080',
                    count: item.count
                });
            }
            return acc;
        }, {} as Record<string, any>);

        return Object.values(groupedData);
    }, {
        permission: 'orders.edit',
        query: t.Object({
            start_date: t.Optional(t.String()),
            end_date: t.Optional(t.String())
        })
    })
    .get('/top-terminals', async ({ drizzle, query }) => {
        const { limit = 5, start_date, end_date } = query;
        
        const startDate = start_date ? dayjs(start_date).startOf('day').toDate() : dayjs().startOf('day').toDate();
        const endDate = end_date ? dayjs(end_date).endOf('day').toDate() : dayjs().endOf('day').toDate();
        
        const topTerminals = await drizzle
            .select({
                terminalName: terminals.name,
                terminalId: terminals.id,
                orderCount: count(),
                totalRevenue: sum(orders.order_price)
            })
            .from(orders)
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString())
            ))
            .groupBy(terminals.id, terminals.name)
            .orderBy(sql`COUNT(*) DESC`)
            .limit(limit);

        return topTerminals;
    }, {
        permission: 'orders.edit',
        query: t.Object({
            limit: t.Optional(t.Number({ default: 5 })),
            start_date: t.Optional(t.String()),
            end_date: t.Optional(t.String())
        })
    })
    .get('/top-couriers', async ({ drizzle, query }) => {
        const { limit = 5, start_date, end_date } = query;
        
        const startDate = start_date ? dayjs(start_date).startOf('day').toDate() : dayjs().startOf('day').toDate();
        const endDate = end_date ? dayjs(end_date).endOf('day').toDate() : dayjs().endOf('day').toDate();
        
        const topCouriers = await drizzle
            .select({
                courierId: users.id,
                courierFirstName: users.first_name,
                courierLastName: users.last_name,
                courierPhone: users.phone,
                orderCount: count(),
                totalDelivered: sum(orders.order_price),
                avgDeliveryTime: avg(orders.duration)
            })
            .from(orders)
            .leftJoin(users, eq(orders.courier_id, users.id))
            .where(and(
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString()),
                sql`${orders.courier_id} IS NOT NULL`
            ))
            .groupBy(users.id, users.first_name, users.last_name, users.phone)
            .orderBy(sql`COUNT(*) DESC`)
            .limit(limit);

        return topCouriers;
    }, {
        permission: 'orders.edit',
        query: t.Object({
            limit: t.Optional(t.Number({ default: 5 })),
            start_date: t.Optional(t.String()),
            end_date: t.Optional(t.String())
        })
    });