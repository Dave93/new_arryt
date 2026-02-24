import { Database } from "duckdb-async";

export async function syncDuck(db: Database) {
    // install postgres and attach database
    await db.exec(`INSTALL postgres; LOAD postgres;`);
    await db.exec(`ATTACH '${process.env.DATABASE_URL}' AS db (TYPE POSTGRES);`);

    // load data
    await db.exec(`CREATE TABLE IF NOT EXISTS permissions AS FROM db.permissions;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS roles AS FROM db.roles;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS roles_permissions AS FROM db.roles_permissions;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS organization AS FROM db.organization;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS terminals AS FROM db.terminals;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS daily_garant AS FROM db.daily_garant;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS users AS FROM db.users;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS users_terminals AS FROM db.users_terminals;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS users_roles AS FROM db.users_roles;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS work_schedules AS FROM db.work_schedules;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS users_work_schedules AS FROM db.users_work_schedules;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS work_schedule_entries AS FROM db.work_schedule_entries;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS timesheet AS FROM db.timesheet;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS system_configs AS FROM db.system_configs;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS scheduled_reports AS FROM db.scheduled_reports;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS scheduled_reports_subscription AS FROM db.scheduled_reports_subscription;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS otp AS FROM db.otp;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS api_tokens AS FROM db.api_tokens;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS assets AS FROM db.assets;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS brands AS FROM db.brands;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS customers AS FROM db.customers;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS customers_comments AS FROM db.customers_comments;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS daily_garant_tasks AS FROM db.daily_garant_tasks;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS delivery_pricing AS FROM db.delivery_pricing;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS order_status AS FROM db.order_status;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS order_bonus_pricing AS FROM db.order_bonus_pricing;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS orders AS FROM db.orders;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS order_items AS FROM db.order_items;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS missed_orders AS FROM db.missed_orders;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS order_transactions AS FROM db.order_transactions;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS order_actions AS FROM db.order_actions;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS courier_terminal_balance AS FROM db.courier_terminal_balance;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS manager_withdraw AS FROM db.manager_withdraw;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS manager_withdraw_transactions AS FROM db.manager_withdraw_transactions;`);

}
