import { manager_withdraw, users, terminals, manager_withdraw_transactions, order_transactions, orders } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type ManagerWithdrawWithRelations = InferSelectModel<typeof manager_withdraw> & {
    managers: InferSelectModel<typeof users>;
    terminals: InferSelectModel<typeof terminals>;
    couriers: InferSelectModel<typeof users>;
};

export type ManagerWithdrawTransactionsWithRelations = InferSelectModel<typeof manager_withdraw_transactions> & {
    order_transactions: InferSelectModel<typeof order_transactions>;
    orders: InferSelectModel<typeof orders>;
};