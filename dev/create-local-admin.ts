// Создаёт (или обновляет) локального супер-админа для входа в new_admin.
// Только для локальной базы: скрипт отказывается работать не с 127.0.0.1.
//
//   cd api && bun ../dev/create-local-admin.ts
//
// Логин и пароль пишутся в dev/data/local-admin.txt (в git не попадает).
import { eq } from "drizzle-orm";
import { db, pool } from "../api/src/lib/db";
import { client as redis } from "../api/src/context/redis";
import { roles, users, users_roles } from "../api/drizzle/schema";
import { CacheControlService } from "../api/src/modules/cache/service";

if (!/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) {
  console.error("DATABASE_URL не локальный — отказ. Запускай из api/ с api/.env.local.");
  process.exit(1);
}

const LOGIN = "local_admin";
const password = crypto.randomUUID().slice(0, 12);
const hash = await Bun.password.hash(password);

const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, "super_admin"));
if (!role) throw new Error("Нет роли super_admin — сначала bash dev/pull-db.sh");

let [user] = await db.select({ id: users.id }).from(users).where(eq(users.login, LOGIN));
if (user) {
  await db.update(users).set({ password: hash, status: "active" }).where(eq(users.id, user.id));
} else {
  [user] = await db
    .insert(users)
    .values({
      login: LOGIN,
      password: hash,
      phone: "+998000000000",
      first_name: "Local",
      last_name: "Admin",
      status: "active",
      wallet_balance: 0,
    })
    .returning({ id: users.id });
  await db.insert(users_roles).values({ user_id: user.id, role_id: role.id });
}

// Логин читает пользователя из Redis-кэша — обновляем его.
await new CacheControlService(db, redis).cacheUsers();

const out = new URL("./data/local-admin.txt", import.meta.url);
await Bun.write(out, `login: ${LOGIN}\npassword: ${password}\n`);
console.log(`✓ ${LOGIN} готов, пароль в dev/data/local-admin.txt`);
await pool.end();
redis.disconnect();
process.exit(0);
