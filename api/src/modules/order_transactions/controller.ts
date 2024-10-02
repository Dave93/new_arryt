import { courier_terminal_balance, order_transactions } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { eq, and } from "drizzle-orm";
import Elysia, { t } from "elysia";

export const orderTransactionsController = new Elysia({
    name: "@app/order_transactions",
})
    .use(ctx)
    .post('/order_transactions', async ({ body: { data: { terminal_id, amount, comment, courier_id } }, redis, cacheControl, drizzle, user }) => {
        const terminals = await cacheControl.getTerminals();
        const terminal = terminals.find((t) => t.id === terminal_id);

        const courierTerminalBalance = await drizzle.select({
            balance: courier_terminal_balance.balance,
            id: courier_terminal_balance.id
        }).from(courier_terminal_balance)
            .where(
                and(
                    eq(courier_terminal_balance.terminal_id, terminal_id),
                    eq(courier_terminal_balance.courier_id, courier_id)
                )
            )
            .execute();

        await drizzle.insert(order_transactions).values({
            not_paid_amount: amount,
            // @ts-ignore
            created_by: user.user.id,
            courier_id,
            terminal_id,
            amount,
            comment,
            organization_id: terminal?.organization_id,
            balance_before: courierTerminalBalance[0]?.balance || 0,
            balance_after: courierTerminalBalance[0]?.balance || 0 + amount,
            transaction_type: 'courier_terminal_balance'
        }).execute();

        if (courierTerminalBalance.length > 0) {
            await drizzle.update(courier_terminal_balance)
                .set({
                    balance: courierTerminalBalance[0].balance + amount
                })
                .where(
                    and(
                        eq(courier_terminal_balance.id, courierTerminalBalance[0].id)
                    )
                ).execute();
        } else {
            await drizzle.insert(courier_terminal_balance).values({
                courier_id,
                terminal_id,
                balance: amount,
                organization_id: terminal?.organization_id || null,
                // @ts-ignore
                created_by: user.user.id
            }).execute();
        }

        return {
            success: true
        }


    }, {
        permission: 'order_transactions.create',
        body: t.Object({
            data: t.Object({
                terminal_id: t.String(),
                amount: t.Number(),
                comment: t.String(),
                courier_id: t.String()
            }),
        }),
    });
