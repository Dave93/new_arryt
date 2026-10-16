import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { settleDailyGarant } from "@api/src/services/daily_garant/service";
import Redis from "ioredis";

type TrySetDailyGarantData = {
    courier_id: string;
    /** Рабочий день закрытой смены, YYYY-MM-DD. */
    day: string;
};

/**
 * Начисление дневного гаранта после закрытия смены. Вся логика — в
 * settleDailyGarant, общая с кнопкой в «Перекличке». Отказ (не заслужил, уже
 * начислено и т.п.) — не ошибка, задача завершается; падение БД пробросится,
 * и BullMQ повторит задачу — повтор безопасен.
 */
export const processTrySetDailyGarant = async (
    redis: Redis,
    db: DB,
    cacheControl: CacheControlService,
    data: TrySetDailyGarantData
) => {
    const result = await settleDailyGarant(
        { db, redis, cacheControl },
        { courierId: data.courier_id, day: data.day }
    );
    console.log(
        `[daily_garant] courier=${result.courierId} day=${result.day} status=${result.status}` +
            (result.reason ? ` reason=${result.reason}` : "") +
            (result.payout !== undefined ? ` payout=${result.payout} earned=${result.earned} penalty=${result.penalty}` : "")
    );
    return result;
};
