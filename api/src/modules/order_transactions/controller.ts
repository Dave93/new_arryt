import { courier_terminal_balance, order_transactions, orders, terminals, users } from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { eq, and, desc, SQLWrapper } from "drizzle-orm";
import Elysia, { t } from "elysia";

export const orderTransactionsController = new Elysia({
    name: "@app/order_transactions",
    prefix: "/api/order_transactions",
})
    .use(contextWitUser)
    .get('/', async ({ drizzle, query: {
        filters
    } }) => {
        let whereClause: (SQLWrapper | undefined)[] = [];
        if (filters) {
            whereClause = parseFilterFields(filters, order_transactions, {
                orders,
                terminals,
                users
            });
        }
        const transactions = await drizzle
            .select({
                id: order_transactions.id,
                order_id: order_transactions.order_id,
                created_at: order_transactions.created_at,
                amount: order_transactions.amount,
                status: order_transactions.status,
                balance_before: order_transactions.balance_before,
                balance_after: order_transactions.balance_after,
                comment: order_transactions.comment,
                not_paid_amount: order_transactions.not_paid_amount,
                transaction_type: order_transactions.transaction_type,
                order_number: orders.order_number,
                terminal_name: terminals.name,
                first_name: users.first_name,
                last_name: users.last_name
            })
            .from(order_transactions)
            .leftJoin(orders, eq(order_transactions.order_id, orders.id))
            .leftJoin(terminals, eq(order_transactions.terminal_id, terminals.id))
            .leftJoin(users, eq(order_transactions.created_by, users.id))
            .where(and(...whereClause))
            .orderBy(desc(order_transactions.created_at))
            .execute();

        // const transactionsResponse = await fetch(`${process.env.DUCK_API}/order_transactions`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //         filter: JSON.parse(filters)
        //     })
        // });

        // const transactions = await transactionsResponse.json();

        return transactions;
    },
        {
            permission: 'order_transactions.list',
            query: t.Object({
                filters: t.String(),
            }),
        })
    .post('/', async ({ body: { data: { terminal_id, amount, comment, courier_id } }, redis, cacheControl, drizzle, user }) => {
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
            organization_id: terminal!.organization_id!,
            balance_before: courierTerminalBalance[0]?.balance || 0,
            balance_after: (courierTerminalBalance[0]?.balance || 0) + amount,
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
                organization_id: terminal!.organization_id!,
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
