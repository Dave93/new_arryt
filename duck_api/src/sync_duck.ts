import { Database } from "duckdb-async";

export async function syncDuck(db: Database) {
    // install postgres and attach database
    await db.exec(`INSTALL postgres; LOAD postgres;`);
    await db.exec(`ATTACH '${process.env.DATABASE_URL}' AS db (TYPE POSTGRES);`);


    // load data
    console.time('permissions')
    await db.exec(`CREATE TABLE IF NOT EXISTS permissions AS FROM db.permissions;`);
    console.timeEnd("permissions");
    console.time('roles')
    await db.exec(`CREATE TABLE IF NOT EXISTS roles AS FROM db.roles;`);
    console.timeEnd("roles");
    console.time('roles_permissions')
    await db.exec(`CREATE TABLE IF NOT EXISTS roles_permissions AS FROM db.roles_permissions;`);
    console.timeEnd("roles_permissions");
    console.time('organization')
    await db.exec(`CREATE TABLE IF NOT EXISTS organization AS FROM db.organization;`);
    console.timeEnd("organization");
    console.time('terminals')
    await db.exec(`CREATE TABLE IF NOT EXISTS terminals AS FROM db.terminals;`);
    console.timeEnd("terminals");
    console.time('daily_garant')
    await db.exec(`CREATE TABLE IF NOT EXISTS daily_garant AS FROM db.daily_garant;`);
    console.timeEnd("daily_garant");
    console.time('users')
    await db.exec(`CREATE TABLE IF NOT EXISTS users AS FROM db.users;`);
    console.timeEnd("users");
    console.time('users_terminals')
    await db.exec(`CREATE TABLE IF NOT EXISTS users_terminals AS FROM db.users_terminals;`);
    console.timeEnd("users_terminals");
    console.time('users_roles')
    await db.exec(`CREATE TABLE IF NOT EXISTS users_roles AS FROM db.users_roles;`);
    console.timeEnd("users_roles");
    console.time('work_schedules')
    await db.exec(`CREATE TABLE IF NOT EXISTS work_schedules AS FROM db.work_schedules;`);
    console.timeEnd("work_schedules");
    console.time('users_work_schedules')
    await db.exec(`CREATE TABLE IF NOT EXISTS users_work_schedules AS FROM db.users_work_schedules;`);
    console.timeEnd("users_work_schedules");
    console.time('work_schedule_entries')
    await db.exec(`CREATE TABLE IF NOT EXISTS work_schedule_entries AS FROM db.work_schedule_entries;`);
    console.timeEnd("work_schedule_entries");
    console.time('timesheet')
    await db.exec(`CREATE TABLE IF NOT EXISTS timesheet AS FROM db.timesheet;`);
    console.timeEnd("timesheet");
    console.time('system_configs')
    await db.exec(`CREATE TABLE IF NOT EXISTS system_configs AS FROM db.system_configs;`);
    console.timeEnd("system_configs");
    console.time('scheduled_reports')
    await db.exec(`CREATE TABLE IF NOT EXISTS scheduled_reports AS FROM db.scheduled_reports;`);
    console.timeEnd("scheduled_reports");
    console.time('scheduled_reports_subscription')
    await db.exec(`CREATE TABLE IF NOT EXISTS scheduled_reports_subscription AS FROM db.scheduled_reports_subscription;`);
    console.timeEnd("scheduled_reports_subscription");
    console.time('otp')
    await db.exec(`CREATE TABLE IF NOT EXISTS otp AS FROM db.otp;`);
    console.timeEnd("otp");
    console.time('api_tokens')
    await db.exec(`CREATE TABLE IF NOT EXISTS api_tokens AS FROM db.api_tokens;`);
    console.timeEnd("api_tokens");
    console.time('assets')
    await db.exec(`CREATE TABLE IF NOT EXISTS assets AS FROM db.assets;`);
    console.timeEnd("assets");
    console.time('brands')
    await db.exec(`CREATE TABLE IF NOT EXISTS brands AS FROM db.brands;`);
    console.timeEnd("brands");
    console.time('customers')
    await db.exec(`CREATE TABLE IF NOT EXISTS customers AS FROM db.customers;`);
    console.timeEnd("customers");
    console.time('customers_comments')
    await db.exec(`CREATE TABLE IF NOT EXISTS customers_comments AS FROM db.customers_comments;`);
    console.timeEnd("customers_comments");
    console.time('daily_garant_tasks')
    await db.exec(`CREATE TABLE IF NOT EXISTS daily_garant_tasks AS FROM db.daily_garant_tasks;`);
    console.timeEnd("daily_garant_tasks");
    console.time('delivery_pricing')
    await db.exec(`CREATE TABLE IF NOT EXISTS delivery_pricing AS FROM db.delivery_pricing;`);
    console.timeEnd("delivery_pricing");
    console.time('order_status')
    await db.exec(`CREATE TABLE IF NOT EXISTS order_status AS FROM db.order_status;`);
    console.timeEnd("order_status");
    console.time('order_bonus_pricing')
    await db.exec(`CREATE TABLE IF NOT EXISTS order_bonus_pricing AS FROM db.order_bonus_pricing;`);
    console.timeEnd("order_bonus_pricing");
    console.time('orders')
    await db.exec(`CREATE TABLE IF NOT EXISTS orders AS FROM db.orders;`);
    console.timeEnd("orders");
    console.time('order_items')
    await db.exec(`CREATE TABLE IF NOT EXISTS order_items AS FROM db.orders;`);
    console.timeEnd("order_items");
    console.time('missed_orders')
    await db.exec(`CREATE TABLE IF NOT EXISTS missed_orders AS FROM db.missed_orders;`);
    console.timeEnd("missed_orders");
    console.time('order_transactions')
    await db.exec(`CREATE TABLE IF NOT EXISTS order_transactions AS FROM db.order_transactions;`);
    console.timeEnd("order_transactions");
    console.time('order_actions')
    await db.exec(`CREATE TABLE IF NOT EXISTS order_actions AS FROM db.order_actions;`);
    console.timeEnd("order_actions");
    console.time('courier_terminal_balance')
    await db.exec(`CREATE TABLE IF NOT EXISTS courier_terminal_balance AS FROM db.courier_terminal_balance;`);
    console.timeEnd("courier_terminal_balance");
    console.time('manager_withdraw')
    await db.exec(`CREATE TABLE IF NOT EXISTS manager_withdraw AS FROM db.manager_withdraw;`);
    console.timeEnd("manager_withdraw");
    console.time('manager_withdraw_transactions')
    await db.exec(`CREATE TABLE IF NOT EXISTS manager_withdraw_transactions AS FROM db.manager_withdraw_transactions;`);
    console.timeEnd("manager_withdraw_transactions");

}
