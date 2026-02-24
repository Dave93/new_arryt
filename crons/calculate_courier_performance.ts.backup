import { db } from "@api/src/lib/db";
import { and, eq, sql, desc, asc, gte, lte, isNull, or, inArray, notInArray } from "@api/node_modules/drizzle-orm";
import {
    work_schedule_entries,
    users,
    courier_performances,
    users_roles,
    roles,
    users_terminals,
    orders,
    terminals
} from "@api/drizzle/schema";
import Redis from "ioredis";
import _ from 'lodash';
import { CacheControlService } from "@api/src/modules/cache/service";

export const redisClient = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

const cacheControl = new CacheControlService(db, redisClient);

interface CourierWithTerminal {
    id: string;
    terminal_id: string;
}

async function getLinkedTerminalIds(terminalId: string): Promise<string[]> {
    const terminal = await db
        .select({
            id: terminals.id,
            linked_terminal_id: terminals.linked_terminal_id,
        })
        .from(terminals)
        .where(eq(terminals.id, terminalId))
        .execute();

    if (!terminal.length) return [terminalId];

    const linkedTerminalId = terminal[0].linked_terminal_id;

    if (!linkedTerminalId) return [terminalId];

    // Get all terminals that are linked to the same parent
    const linkedTerminals = await db
        .select({
            id: terminals.id,
        })
        .from(terminals)
        .where(
            or(
                eq(terminals.linked_terminal_id, linkedTerminalId),
                eq(terminals.id, linkedTerminalId)
            )
        )
        .execute();

    return [terminalId, ...linkedTerminals.map(t => t.id)];
}

async function main() {
    try {
        // Get first day of current month at 00:00:00
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();


        // const startOfMonth = '2024-11-01T00:00:00.000Z';
        // const endOfMonth = '2024-11-30T23:59:59.999Z';
        // console.log('Starting courier performance calculation for period:', { startOfMonth, endOfMonth });

        // Get all active couriers with their terminals
        const couriers = await db
            .select({
                id: users.id,
                terminal_id: users_terminals.terminal_id,
            })
            .from(users)
            .innerJoin(users_roles, eq(users_roles.user_id, users.id))
            .innerJoin(roles, eq(users_roles.role_id, roles.id))
            .innerJoin(users_terminals, eq(users_terminals.user_id, users.id))
            .where(
                and(
                    eq(users.status, 'active'),
                    eq(roles.code, 'courier'),
                    notInArray(users.id, [
                        '6fa8644f-b931-4a8e-b5f9-d96d1df7fe72', // Yandex Sarvar
                        '34689421-92b1-4880-9a75-8be6cc0cb01f' // Yandex Dostavka
                    ])
                )
            )
            .execute();

        const orderStatuses = await cacheControl.getOrderStatuses();
        const notCancelledOrderStatuses = orderStatuses.filter(status => !status.cancel).map(status => status.id);

        // Group couriers by terminal for ranking
        const couriersByTerminal = _.groupBy(couriers as CourierWithTerminal[], 'terminal_id');

        // Get all orders for all couriers in advance
        const allCourierOrders = await db
            .select({
                id: orders.id,
                courier_id: orders.courier_id,
                created_at: orders.created_at,
                finished_date: orders.finished_date,
                terminal_id: orders.terminal_id,
            })
            .from(orders)
            .where(
                and(
                    inArray(orders.courier_id, couriers.map(c => c.id)),
                    gte(orders.created_at, startOfMonth),
                    lte(orders.created_at, endOfMonth),
                    inArray(orders.order_status_id, notCancelledOrderStatuses)
                )
            )
            .execute();

        // Group orders by courier
        const ordersByCourier = _.groupBy(allCourierOrders, 'courier_id');

        // Calculate performance for each courier
        for (const courier of couriers) {
            try {
                const terminalIds = await getLinkedTerminalIds(courier.terminal_id);

                // Delete existing record for this courier for current month
                await db.delete(courier_performances)
                    .where(
                        and(
                            eq(courier_performances.courier_id, courier.id),
                            eq(courier_performances.created_at, startOfMonth)
                        )
                    )
                    .execute();

                // console.log('terminalIds', terminalIds);
                // Run queries concurrently
                const [completedOrdersCount, averageScore, allOrders] = await Promise.all([
                    // Get completed orders count (excluding cancelled orders)
                    db
                        .select({
                            count: sql<number>`count(*)::int`,
                        })
                        .from(orders)
                        .where(
                            and(
                                eq(orders.courier_id, courier.id),
                                gte(orders.created_at, startOfMonth),
                                lte(orders.created_at, endOfMonth),
                                inArray(orders.terminal_id, terminalIds),
                                inArray(orders.order_status_id, notCancelledOrderStatuses)
                            )
                        )
                        .execute(),

                    // Get average score
                    db
                        .select({
                            avg_score: sql<number>`AVG(COALESCE(${orders.score}, 0))::int`,
                        })
                        .from(orders)
                        .where(
                            and(
                                eq(orders.courier_id, courier.id),
                                gte(orders.created_at, startOfMonth),
                                lte(orders.created_at, endOfMonth),
                                inArray(orders.terminal_id, terminalIds),
                                sql`${orders.finished_date} IS NOT NULL`
                            )
                        )
                        .execute(),

                    // Get all completed orders for position calculation
                    db
                        .select({
                            id: orders.id,
                            created_at: orders.created_at,
                            finished_date: orders.finished_date,
                            score: orders.score,
                        })
                        .from(orders)
                        .where(
                            and(
                                eq(orders.courier_id, courier.id),
                                gte(orders.created_at, startOfMonth),
                                lte(orders.created_at, endOfMonth),
                                inArray(orders.terminal_id, terminalIds),
                                inArray(orders.order_status_id, notCancelledOrderStatuses)
                            )
                        )
                        .execute()
                ]);

                const deliveryCount = completedOrdersCount[0]?.count || 0;
                const rating = averageScore[0]?.avg_score || 0;

                // Calculate average delivery time for finished orders
                const finishedOrders = allOrders.filter(order => order.finished_date);
                const totalMinutes = finishedOrders.reduce((sum, order) => {
                    const finishTime = new Date(order.finished_date!);
                    const createTime = new Date(order.created_at);
                    return sum + ((finishTime.getTime() - createTime.getTime()) / (1000 * 60));
                }, 0);

                const deliveryAverageTime = finishedOrders.length > 0
                    ? Math.round(totalMinutes / finishedOrders.length)
                    : 0;

                // Get courier's position among others in all linked terminals
                const allLinkedTerminalCouriers = terminalIds.flatMap(tid => couriersByTerminal[tid] || []);
                console.log('allLinkedTerminalCouriers', allLinkedTerminalCouriers);
                const uniqueCouriers = _.uniqBy(allLinkedTerminalCouriers, 'id');
                const position = calculatePosition(courier.id, uniqueCouriers, ordersByCourier);

                // Save performance record with first day of month as created_at
                await db.insert(courier_performances).values({
                    courier_id: courier.id,
                    terminal_keys: JSON.stringify(terminalIds),
                    rating,
                    delivery_count: deliveryCount,
                    delivery_average_time: deliveryAverageTime,
                    position,
                    total_active_couriers: uniqueCouriers.length,
                    created_at: startOfMonth,
                }).execute();

                // console.log('Updated performance for courier:', {
                //     courier_id: courier.id,
                //     delivery_count: deliveryCount,
                //     average_time: deliveryAverageTime,
                //     position,
                //     terminal_count: terminalIds.length,
                //     total_active_couriers: uniqueCouriers.length
                // });

            } catch (error) {
                console.error('Error processing courier:', {
                    courier_id: courier.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                // Continue with next courier
                continue;
            }
        }

        console.log('Finished courier performance calculation');
        process.exit(0);
    } catch (error) {
        console.error('Fatal error in courier performance calculation:', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error; // Re-throw to ensure the process exits with error
    }
}

interface CourierOrderStats {
    id: string;
    deliveryCount: number;
    averageTime: number;
}

function calculatePosition(
    courierId: string,
    terminalCouriers: CourierWithTerminal[],
    ordersByCourier: Record<string, Array<{
        created_at: string;
        finished_date: string | null;
    }>>
): number {
    // Calculate stats for each courier
    const courierStats: CourierOrderStats[] = terminalCouriers.map(courier => {
        const courierOrders = ordersByCourier[courier.id] || [];
        const finishedOrders = courierOrders.filter(order => order.finished_date);

        const totalMinutes = finishedOrders.reduce((sum, order) => {
            const finishTime = new Date(order.finished_date!);
            const createTime = new Date(order.created_at);
            return sum + ((finishTime.getTime() - createTime.getTime()) / (1000 * 60));
        }, 0);

        return {
            id: courier.id,
            deliveryCount: finishedOrders.length,
            averageTime: finishedOrders.length > 0 ? totalMinutes / finishedOrders.length : Infinity
        };
    });

    // Sort couriers by delivery count (desc) and average time (asc)
    const sortedCouriers = courierStats.sort((a, b) => {
        // First compare by delivery count
        const countDiff = b.deliveryCount - a.deliveryCount;
        if (countDiff !== 0) return countDiff;

        // If delivery counts are equal, compare by average time
        return a.averageTime - b.averageTime;
    });

    return sortedCouriers.findIndex(c => c.id === courierId) + 1;
}

// Add proper error handling for the main execution
main().catch(error => {
    console.error('Failed to execute courier performance calculation:', error);
    process.exit(1);
});
