import { courier_terminal_balance, delivery_pricing, order_transactions, orders } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import dayjs from "dayjs";
import { eq, and, gte, lte, InferSelectModel } from "drizzle-orm";

export const processOrderComplete = async (db: DB, cacheControl: CacheControlService, data: InferSelectModel<typeof orders>) => {
    const orderStatuses = await cacheControl.getOrderStatuses();

    const organization = await cacheControl.getOrganization(data.organization_id);

    if (!data.courier_id) {
        return;
    }

    const orderTransaction = await db.select({
        id: order_transactions.id,
    })
        .from(order_transactions)
        .where(and(
            eq(order_transactions.order_id, data.id),
            gte(order_transactions.created_at, dayjs().subtract(4, 'days').format('YYYY-MM-DD HH:mm:ss')),
            lte(order_transactions.created_at, dayjs().format('YYYY-MM-DD HH:mm:ss')),
        ))
        .limit(1);
    console.log('orderTransaction.length', orderTransaction.length)
    if (orderTransaction.length > 0) {
        return;
    }

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

    let orderBonusPricing = await cacheControl.getConstructedBonusPricingByOrganization(data.organization_id);
    console.log('orderBonusPricing', orderBonusPricing)
    if (orderBonusPricing) {
        const duration = dayjs().diff(data.created_at, 'minutes');
        console.log('duration', duration)
        let pricing = orderBonusPricing.pricing as any[] | string;
        if (typeof pricing === 'string') {
            pricing = JSON.parse(pricing) as any[];
        }


        const pricings = pricing.filter((pricing) => pricing.terminal_ids.includes(data.terminal_id));
        const rules = pricings?.map((pricing) =>
            [...pricing.rules].filter(
                (rule) =>
                    data.pre_distance * 1000 > rule.distance_from * 1000 &&
                    data.pre_distance * 1000 <= rule.distance_to * 1000,
            ),
        );
        let resultRules: any[] = [];
        for (const rule of rules) {
            resultRules = [...resultRules, ...rule];
        }

        // sort resultRules by time_to
        resultRules.sort((a, b) => a.time_to - b.time_to);

        console.log('resultRules', resultRules)
        const bonusPrice: number = resultRules?.find((rule) => duration > rule.time_from && duration <= rule.time_to)?.price;
        if (bonusPrice && bonusPrice > 0) {
            await db.insert(order_transactions)
                .values({
                    order_id: data.id,
                    terminal_id: data.terminal_id!,
                    courier_id: data.courier_id!,
                    organization_id: data.organization_id!,
                    amount: bonusPrice,
                    not_paid_amount: bonusPrice,
                    transaction_type: 'order_bonus',
                    transaction_payment_type: 'cash',
                    balance_before: startBalance,
                    balance_after: startBalance + bonusPrice,
                })
                .execute();
            if (courierTerminalBalance.length) {
                startBalance += bonusPrice;
                await db.update(courier_terminal_balance).set({
                    balance: startBalance,
                }).where(eq(courier_terminal_balance.id, courierTerminalBalance[0].id)).execute();
            } else {
                courierTerminalBalance = await db.insert(courier_terminal_balance).values({
                    courier_id: data.courier_id!,
                    terminal_id: data.terminal_id!,
                    balance: bonusPrice,
                    organization_id: data.organization_id!,
                }).returning().execute();
            }
        }
    }

    let isCash = false;


    if (organization.payment_type == 'cash') {
        isCash = true;
    } else {
        const deliveryPricing = await db.select({
            payment_type: delivery_pricing.payment_type,
        })
            .from(delivery_pricing)
            .where(
                eq(delivery_pricing.id, data.delivery_pricing_id!)
            )
            .limit(1)
            .execute();

        if (deliveryPricing.length) {
            isCash = deliveryPricing[0].payment_type == 'cash';
        }
    }
    if (isCash) {
        try {
            await db.insert(order_transactions).values({
                order_id: data.id,
                terminal_id: data.terminal_id!,
                courier_id: data.courier_id!,
                organization_id: data.organization_id!,
                amount: +data.delivery_price,
                not_paid_amount: +data.delivery_price,
                transaction_type: 'order',
                transaction_payment_type: 'cash',
                balance_before: startBalance,
                balance_after: startBalance + +data.delivery_price,
            }).execute();

            if (courierTerminalBalance.length) {
                startBalance += +data.delivery_price;
                await db.update(courier_terminal_balance).set({
                    balance: startBalance,
                }).where(eq(courier_terminal_balance.id, courierTerminalBalance[0].id)).execute();
            } else {
                courierTerminalBalance = await db.insert(courier_terminal_balance).values({
                    courier_id: data.courier_id!,
                    terminal_id: data.terminal_id!,
                    balance: +data.delivery_price,
                    organization_id: data.organization_id!,
                }).returning().execute();
            }
        } catch (e) {
            console.log('processOrderComplete', e);
        }

    }
}