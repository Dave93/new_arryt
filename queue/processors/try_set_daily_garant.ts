import { courier_terminal_balance, daily_garant, order_transactions, orders, terminals, timesheet, users, work_schedule_entries, work_schedules } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { getHours } from "@api/src/lib/dates"
import { CacheControlService } from "@api/src/modules/cache/service";
import { getSetting } from "@api/src/utils/settings";
import dayjs from "dayjs";
import { and, desc, eq, inArray, not, sql } from "drizzle-orm";
import Redis from "ioredis";

type TrySetDailyGarantData = {
    courier_id: string;
}
export const processTrySetDailyGarant = async (redis: Redis, db: DB, cacheControl: CacheControlService, data: TrySetDailyGarantData) => {
    const courierList = await db.select({
        id: users.id,
        daily_garant_id: users.daily_garant_id
    })
        .from(users)
        .where(eq(users.id, data.courier_id))
        .execute();

    const courier = courierList.at(0);

    if (!courier) {
        return;
    }

    if (!courier.daily_garant_id) {
        return;
    }

    const dailyGarant = (await cacheControl.getDailyGarant()).find(d => d.id === courier.daily_garant_id);

    if (!dailyGarant) {
        return;
    }


    let dailyGarantMaxDifference = await getSetting(redis, 'daily_garant_max_difference');

    if (!dailyGarantMaxDifference) {
        return;
    }

    dailyGarantMaxDifference = parseInt(dailyGarantMaxDifference);

    const lastWorkScheduleEntry = (await db.select({
        id: work_schedule_entries.id,
        current_status: work_schedule_entries.current_status,
        created_at: work_schedule_entries.created_at,
        date_finish: work_schedule_entries.date_finish
    })
        .from(work_schedules)
        .where(eq(work_schedule_entries.user_id, data.courier_id))
        .orderBy(desc(work_schedule_entries.created_at))
        .limit(1)
        .execute()).at(0);

    if (!lastWorkScheduleEntry) {
        return;
    }

    if (lastWorkScheduleEntry.current_status === 'closed') {
        // dayjs difference in minutes should not be more than dailyGarantMaxDifference
        if (dayjs().diff(lastWorkScheduleEntry.date_finish, 'minutes') < dailyGarantMaxDifference) {
            const settingsWorkStartTime = getHours(
                await getSetting(redis, "work_start_time")
            );
            const settingsWorkEndTime = getHours(
                await getSetting(redis, "work_end_time")
            );

            let startDate = dayjs();
            let endDate = dayjs();
            const hour = startDate.hour();
            if (hour <= settingsWorkStartTime) {
                startDate = startDate.subtract(1, 'day').hour(settingsWorkStartTime);
                endDate = endDate.hour(settingsWorkEndTime);
            } else {
                startDate = startDate.hour(settingsWorkStartTime);
                endDate = endDate.add(1, 'day').hour(settingsWorkEndTime);
            }

            const orderStatuses = await cacheControl.getOrderStatuses();
            // get only order status where finish is false or cancel is false
            const filteredOrderStatuses = orderStatuses.filter((orderStatus) => !orderStatus.finish && !orderStatus.cancel);

            const notFinishedOrders = await db.select({
                id: orders.id,
            }).from(orders).where(and(
                eq(orders.courier_id, data.courier_id),
                inArray(orders.order_status_id, filteredOrderStatuses.map(orderStatus => orderStatus.id)),
                gte(orders.created_at, startDate.toISOString()),
                lte(orders.created_at, endDate.toISOString()),
            )).execute();

            if (!notFinishedOrders.length) {
                const finishedOrderStatuses = orderStatuses.filter((orderStatus) => orderStatus.finish);
                let totalEarned = 0;
                const finishedOrders = await db.select<{ delivery_price: number }>({
                    delivery_price: sql<number>`sum(${orders.delivery_price})`
                })
                    .from(orders)
                    .where(and(
                        eq(orders.courier_id, data.courier_id),
                        inArray(orders.order_status_id, finishedOrderStatuses.map(orderStatus => orderStatus.id)),
                        gte(orders.created_at, startDate.toISOString()),
                        lte(orders.created_at, endDate.toISOString()),
                    ))
                    .groupBy(orders.courier_id)
                    .execute();

                totalEarned += +finishedOrders[0].delivery_price || 0;

                const orderTransactionsSum = await db.select<{ sum: number }>({
                    sum: sql<number>`sum(${order_transactions.amount})`
                })
                    .from(order_transactions)
                    .where(and(
                        eq(order_transactions.courier_id, data.courier_id),
                        gte(order_transactions.created_at, startDate.toISOString()),
                        lte(order_transactions.created_at, endDate.toISOString()),
                        not(eq(order_transactions.transaction_type, 'order'))
                    ))
                    .execute();

                totalEarned += orderTransactionsSum.at(0)?.sum || 0;

                const timesheetList = await db.select({
                    id: timesheet.id,
                    late_minutes: timesheet.late_minutes
                })
                    .from(timesheet)
                    .where(eq(timesheet.user_id, data.courier_id))
                    .orderBy(desc(timesheet.created_at))
                    .limit(1)
                    .execute();

                const lastTimesheet = timesheetList.at(0);

                const lateMinutes = lastTimesheet?.late_minutes || 0;
                const lateMinutesBy30 = lateMinutes / 30;
                const minusAmount = lateMinutesBy30 * dailyGarant.late_minus_sum;



                if (totalEarned > dailyGarant.amount) {
                    dailyGarant.amount -= (totalEarned + minusAmount);

                    if (dailyGarant.amount > 0) {
                        const firstOrder = await db.select({
                            id: orders.id,
                            terminal_id: orders.terminal_id,
                            organization_id: orders.organization_id
                        })
                            .from(orders)
                            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
                            .where(and(
                                eq(orders.courier_id, data.courier_id),
                                inArray(orders.order_status_id, finishedOrderStatuses.map(orderStatus => orderStatus.id)),
                                gte(orders.created_at, startDate.toISOString()),
                                lte(orders.created_at, endDate.toISOString()),
                                eq(terminals.fuel_bonus, true)
                            ))
                            .limit(1)
                            .execute();
                        const order = firstOrder.at(0);
                        const terminal = order?.terminal_id;
                        const organization = order?.organization_id;

                        if (terminal && organization) {
                            let courierTerminalBalance = await db.select()
                                .from(courier_terminal_balance)
                                .where(
                                    and(
                                        eq(courier_terminal_balance.courier_id, data.courier_id!),
                                        eq(courier_terminal_balance.terminal_id, data.terminal_id),
                                    )
                                )
                                .limit(1)
                                .execute();


                            let startBalance = 0;
                            console.log('startBalance', startBalance)
                            if (courierTerminalBalance.length) {
                                startBalance = courierTerminalBalance[0].balance;
                            }

                            const orderTransaction = await db.select({
                                id: order_transactions.id,
                            })
                                .from(order_transactions)
                                .where(and(
                                    eq(order_transactions.transaction_type, 'daily_garant'),
                                    eq(order_transactions.transaction_payment_type, 'cash'),
                                    eq(order_transactions.courier_id, data.courier_id),
                                    gte(order_transactions.created_at, startDate.toISOString()),
                                    lte(order_transactions.created_at, endDate.toISOString()),
                                ))
                                .limit(1);

                            if (!orderTransaction.length) {
                                await db.insert(order_transactions).values({
                                    transaction_type: 'daily_garant',
                                    transaction_payment_type: "cash",
                                    amount: dailyGarant.amount,
                                    courier_id: data.courier_id,
                                    terminal_id: terminal,
                                    organization_id: organization,
                                    balance_before: startBalance,
                                    balance_after: startBalance + dailyGarant.amount,
                                }).execute();

                                if (courierTerminalBalance.length) {
                                    await db.update(courier_terminal_balance).set({
                                        balance: startBalance + dailyGarant.amount,
                                    }).where(and(
                                        eq(courier_terminal_balance.courier_id, data.courier_id!),
                                        eq(courier_terminal_balance.terminal_id, terminal),
                                    )).execute();
                                } else {
                                    await db.insert(courier_terminal_balance).values({
                                        courier_id: data.courier_id,
                                        terminal_id: terminal,
                                        balance: startBalance + dailyGarant.amount,
                                        organization_id: organization,
                                    }).execute();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

}
