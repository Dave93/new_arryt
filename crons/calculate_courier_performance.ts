import { db } from "@api/src/lib/db";
import { and, eq, sql, gte, lte, or, inArray, notInArray } from "@api/node_modules/drizzle-orm";
import {
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

interface OrderData {
    id: string;
    courier_id: string;
    created_at: string;
    finished_date: string | null;
    terminal_id: string;
    score: number | null;
}

// Cache for linked terminal IDs
const linkedTerminalCache = new Map<string, string[]>();

async function preloadLinkedTerminals(): Promise<void> {
    // Load all terminals with their links in one query
    const allTerminals = await db
        .select({
            id: terminals.id,
            linked_terminal_id: terminals.linked_terminal_id,
        })
        .from(terminals)
        .execute();

    // Build a map of terminal -> linked terminals
    const terminalMap = new Map<string, string | null>();
    allTerminals.forEach(t => terminalMap.set(t.id, t.linked_terminal_id));

    // For each terminal, calculate all linked terminal IDs
    for (const terminal of allTerminals) {
        const linkedId = terminal.linked_terminal_id;
        
        if (!linkedId) {
            linkedTerminalCache.set(terminal.id, [terminal.id]);
            continue;
        }

        // Find all terminals linked to the same parent
        const linkedTerminals = allTerminals
            .filter(t => t.linked_terminal_id === linkedId || t.id === linkedId)
            .map(t => t.id);
        
        linkedTerminalCache.set(terminal.id, [terminal.id, ...linkedTerminals.filter(id => id !== terminal.id)]);
    }
}

function getLinkedTerminalIds(terminalId: string): string[] {
    return linkedTerminalCache.get(terminalId) || [terminalId];
}

async function main() {
    console.time('Total execution time');
    
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        console.log('Starting optimized courier performance calculation');

        // Preload all terminal links in one query
        console.time('Preload terminals');
        await preloadLinkedTerminals();
        console.timeEnd('Preload terminals');

        // Get all active couriers with their terminals
        console.time('Fetch couriers');
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
                        '6fa8644f-b931-4a8e-b5f9-d96d1df7fe72',
                        '34689421-92b1-4880-9a75-8be6cc0cb01f'
                    ])
                )
            )
            .execute();
        console.timeEnd('Fetch couriers');
        console.log(`Found ${couriers.length} couriers`);

        const orderStatuses = await cacheControl.getOrderStatuses();
        const notCancelledOrderStatuses = orderStatuses.filter(status => !status.cancel).map(status => status.id);

        // Get ALL orders for all couriers in one query
        console.time('Fetch all orders');
        const allCourierOrders: OrderData[] = await db
            .select({
                id: orders.id,
                courier_id: orders.courier_id,
                created_at: orders.created_at,
                finished_date: orders.finished_date,
                terminal_id: orders.terminal_id,
                score: orders.score,
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
        console.timeEnd('Fetch all orders');
        console.log(`Found ${allCourierOrders.length} orders`);

        // Group orders by courier for fast lookup
        const ordersByCourier = _.groupBy(allCourierOrders, 'courier_id');
        const couriersByTerminal = _.groupBy(couriers as CourierWithTerminal[], 'terminal_id');

        // Delete all existing records for this month in one query
        console.time('Delete old records');
        await db.delete(courier_performances)
            .where(eq(courier_performances.created_at, startOfMonth))
            .execute();
        console.timeEnd('Delete old records');

        // Calculate all performances in memory
        console.time('Calculate performances');
        const performanceRecords: Array<{
            courier_id: string;
            terminal_keys: string;
            rating: number;
            delivery_count: number;
            delivery_average_time: number;
            position: number;
            total_active_couriers: number;
            created_at: string;
        }> = [];

        // Pre-calculate stats for all couriers (for position calculation)
        const courierStats = new Map<string, { deliveryCount: number; averageTime: number }>();
        
        for (const courier of couriers) {
            const courierOrders = ordersByCourier[courier.id] || [];
            const finishedOrders = courierOrders.filter(order => order.finished_date);
            
            const totalMinutes = finishedOrders.reduce((sum, order) => {
                const finishTime = new Date(order.finished_date!);
                const createTime = new Date(order.created_at);
                return sum + ((finishTime.getTime() - createTime.getTime()) / (1000 * 60));
            }, 0);

            courierStats.set(courier.id, {
                deliveryCount: finishedOrders.length,
                averageTime: finishedOrders.length > 0 ? totalMinutes / finishedOrders.length : Infinity
            });
        }

        for (const courier of couriers) {
            const terminalIds = getLinkedTerminalIds(courier.terminal_id);
            const courierOrders = ordersByCourier[courier.id] || [];
            
            // Filter orders by terminal
            const terminalOrders = courierOrders.filter(o => terminalIds.includes(o.terminal_id));
            
            // Calculate metrics from pre-fetched data
            const deliveryCount = terminalOrders.length;
            const finishedOrders = terminalOrders.filter(order => order.finished_date);
            
            // Calculate average score
            const ordersWithScore = finishedOrders.filter(o => o.score !== null);
            const rating = ordersWithScore.length > 0
                ? Math.round(ordersWithScore.reduce((sum, o) => sum + (o.score || 0), 0) / ordersWithScore.length)
                : 0;
            
            // Calculate average delivery time
            const totalMinutes = finishedOrders.reduce((sum, order) => {
                const finishTime = new Date(order.finished_date!);
                const createTime = new Date(order.created_at);
                return sum + ((finishTime.getTime() - createTime.getTime()) / (1000 * 60));
            }, 0);
            const deliveryAverageTime = finishedOrders.length > 0
                ? Math.round(totalMinutes / finishedOrders.length)
                : 0;

            // Calculate position using pre-calculated stats
            const allLinkedTerminalCouriers = terminalIds.flatMap(tid => couriersByTerminal[tid] || []);
            const uniqueCouriers = _.uniqBy(allLinkedTerminalCouriers, 'id');
            
            const sortedCouriers = uniqueCouriers
                .map(c => ({ id: c.id, ...courierStats.get(c.id)! }))
                .sort((a, b) => {
                    const countDiff = b.deliveryCount - a.deliveryCount;
                    if (countDiff !== 0) return countDiff;
                    return a.averageTime - b.averageTime;
                });
            
            const position = sortedCouriers.findIndex(c => c.id === courier.id) + 1;

            performanceRecords.push({
                courier_id: courier.id,
                terminal_keys: JSON.stringify(terminalIds),
                rating,
                delivery_count: deliveryCount,
                delivery_average_time: deliveryAverageTime,
                position,
                total_active_couriers: uniqueCouriers.length,
                created_at: startOfMonth,
            });
        }
        console.timeEnd('Calculate performances');

        // Batch insert all records
        console.time('Insert records');
        if (performanceRecords.length > 0) {
            // Insert in batches of 50 to avoid query size limits
            const batchSize = 50;
            for (let i = 0; i < performanceRecords.length; i += batchSize) {
                const batch = performanceRecords.slice(i, i + batchSize);
                await db.insert(courier_performances).values(batch).execute();
            }
        }
        console.timeEnd('Insert records');

        console.log(`Processed ${performanceRecords.length} courier performance records`);
        console.timeEnd('Total execution time');
        
        await redisClient.quit();
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error instanceof Error ? error.message : 'Unknown error');
        await redisClient.quit();
        process.exit(1);
    }
}

main();
