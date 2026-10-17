// Прогревает Redis-кэш API из локальной базы. Запускается из pull-db.sh.
//   cd api && bun ../dev/warm-cache.ts
import { getTableColumns } from "drizzle-orm";
import { db, pool } from "../api/src/lib/db";
import { client as redis } from "../api/src/context/redis";
import { terminals } from "../api/drizzle/schema";
import { CacheControlService } from "../api/src/modules/cache/service";

if (!/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) {
  console.error("DATABASE_URL не локальный — отказ.");
  process.exit(1);
}

const c = new CacheControlService(db, redis);
await Promise.all([
  c.cacheUsers(), c.cacheOrganizations(), c.cachePermissions(), c.cacheTerminals(),
  c.cacheDeliveryPricing(), c.cacheWorkSchedules(), c.cacheApiTokens(), c.cacheBrands(),
  c.cacheDailyGarant(), c.cacheOrderBonusPricing(), c.cacheRoles(), c.cacheOrderStatus(),
  c.cacheSystemConfigs(), c.cacheConstructedBonusPricing(),
]);

// `${PREFIX}_terminals` читают перекличка и отчёт по гаранту, но код этого репо
// его не пишет — на проде ключ ведёт другой сервис. Локально кладём сами.
const rows = await db.select(getTableColumns(terminals)).from(terminals);
await redis.set(`${process.env.PROJECT_PREFIX}_terminals`, JSON.stringify(rows));

// конструктор сервиса запускает те же кэши без await — даём им дописаться
await new Promise((r) => setTimeout(r, 2000));
console.log(`✓ кэш прогрет (филиалов: ${rows.length})`);
await pool.end();
redis.disconnect();
process.exit(0);
