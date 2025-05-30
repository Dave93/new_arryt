import { Queue, Worker } from "bullmq";
import Redis from 'ioredis'
import processNewOrderNotify from "@queue/processors/new_order_notify";
import { db } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { SearchService } from "@api/src/services/search/service";
import processOrderIndex from "./processors/order_index";
import processCheckAndSendYandex from "./processors/check_and_send_yandex";
import processFromBasketToCouriers from "./processors/from_basket_to_couriers";
import { processOrderComplete } from "./processors/order_complete";
import processChangeStatus from "./processors/change_status";
import processClearCourier from "./processors/clear_courier";
import processChangeCourier from "./processors/change_courier";
import processStoreLocation from "./processors/store_location";
import processYandexCallback from "./processors/yandex_callback";
import { processSendNotification } from "./processors/send_notification";
import processPushCourierToQueue from "./processors/push_courier_to_queue";
import processSetQueueLastCourier from "./processors/set_queue_last_courier";
import processTryAssignCourier from "./processors/try_assign_courier";
import { processTrySetDailyGarant } from "./processors/try_set_daily_garant";

export const redisClient = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

const cacheControl = new CacheControlService(db, redisClient);
const searchService = new SearchService(cacheControl, db, redisClient);

const newOrderNotifyQueue = new Queue(
    `${process.env.TASKS_PREFIX}_new_order_notify`,
    {
        connection: redisClient,
    }
);
export const processOrderCompleteQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_complete`,
    {
        connection: redisClient,
    }
);

const newOrderNotify = new Worker(
    `${process.env.TASKS_PREFIX}_new_order_notify`,
    async (job) => {
        console.log('new_order_notify', job.data);
        await processNewOrderNotify(redisClient, db, cacheControl, job.data);
        return 'new_order_notify';
    },
    {
        connection: redisClient,
    }
);


const processOrderIndexWorker = new Worker(
    `${process.env.TASKS_PREFIX}_process_order_index`,
    async (job) => {
        console.log('process_order_index', job.data);
        await processOrderIndex(db, searchService, job.data.id, job.data.created_at);
        return 'process_order_index';
    },
    {
        connection: redisClient,
    }
);


const fromBasketToCouriers = new Worker(
    `${process.env.TASKS_PREFIX}_from_basket_to_couriers`,
    async (job) => {
        console.log('from_basket_to_couriers', job.data);
        // await processFromBasketToCouriers(db, cacheControl, newOrderNotifyQueue, processOrderIndexQueue, job.data.id);
        return 'from_basket_to_couriers';
    },
    {
        connection: redisClient,
    }
);

const checkAndSendYandexWorker = new Worker(
    `${process.env.TASKS_PREFIX}_check_and_send_yandex`,
    async (job) => {
        console.log('check_and_send_yandex', job.data);
        await processCheckAndSendYandex(db, redisClient, cacheControl, job.data.id);
        return 'check_and_send_yandex';
    },
    {
        connection: redisClient,
    }
);


const updateUserCacheWorker = new Worker(
    `${process.env.TASKS_PREFIX}_update_user_cache`,
    async (job) => {
        cacheControl.cacheUser(job.data.id);
        return 'update_user_cache';
    },
    {
        connection: redisClient,
    }
);


const orderCompleteWorker = new Worker(
    `${process.env.TASKS_PREFIX}_order_complete`,
    async (job) => {
        // console.log('order_complete', job.data);
        await processOrderComplete(db, cacheControl, job.data);
        return 'order_complete';
    },
    {
        connection: redisClient,
    }
);

const orderEcommerceWebhookWorker = new Worker(
    `${process.env.TASKS_PREFIX}_order_ecommerce_webhook`,
    async (job) => {
        // console.log('order_ecommerce_webhook', job.data);
        return 'order_ecommerce_webhook';
    },
    {
        connection: redisClient,
    }
);

const orderChangeStatusWorker = new Worker(
    `${process.env.TASKS_PREFIX}_order_change_status`,
    async (job) => {
        // console.log('order_change_status', job.data);
        await processChangeStatus(redisClient, db, cacheControl, job.data, processOrderCompleteQueue);
        return 'order_change_status';
    },
    {
        connection: redisClient,
    }
);

const orderClearCourierWorker = new Worker(
    `${process.env.TASKS_PREFIX}_order_clear_courier`,
    async (job) => {
        console.log('order_clear_courier', job.data);
        await processClearCourier(redisClient, db, cacheControl, job.data);
        return 'order_clear_courier';
    },
    {
        connection: redisClient,
    }
);

const orderChangeCourierWorker = new Worker(
    `${process.env.TASKS_PREFIX}_order_change_courier`,
    async (job) => {
        // console.log('order_change_courier', job.data);
        await processChangeCourier(redisClient, db, cacheControl, job.data);
        return 'order_change_courier';
    },
    {
        connection: redisClient,
    }
);

const courierStoreLocationWorker = new Worker(
    `${process.env.TASKS_PREFIX}_courier_store_location`,
    async (job) => {
        // console.log('courier_store_location', job.data);
        await processStoreLocation(redisClient, db, cacheControl, job.data);
        return 'courier_store_location';
    },
    {
        connection: redisClient,
    }
);

const yandexCallbackWorker = new Worker(
    `${process.env.TASKS_PREFIX}_yandex_callback`,
    async (job) => {
        console.log('yandex_callback', job.data);
        await processYandexCallback(redisClient, db, cacheControl, job.data);
        return 'yandex_callback';
    },
    {
        connection: redisClient,
    }
);

const sendNotificationWorker = new Worker(
    `${process.env.TASKS_PREFIX}_send_notification`,
    async (job) => {
        console.log('send_notification', job.data);
        await processSendNotification(redisClient, db, cacheControl, job.data);
        return 'send_notification';
    },
    {
        connection: redisClient,
    }
);


const pushCourierToQueueWorker = new Worker(
    `${process.env.TASKS_PREFIX}_push_courier_to_queue`,
    async (job) => {
        console.log('push_courier_to_queue', job.data);
        await processPushCourierToQueue(redisClient, db, cacheControl, job.data);
        return 'push_courier_to_queue';
    },
    {
        connection: redisClient,
    }
);

const setQueueLastCourierWorker = new Worker(
    `${process.env.TASKS_PREFIX}_set_queue_last_courier`,
    async (job) => {
        console.log('set_queue_last_courier', job.data);
        await processSetQueueLastCourier(redisClient, db, cacheControl, job.data);
        return 'set_queue_last_courier';
    },
    {
        connection: redisClient,
    }
);

const tryAssignCourierQueue = new Queue(
    `${process.env.TASKS_PREFIX}_try_assign_courier`,
    {
        connection: redisClient,
    }
);


const tryAssignCourierWorker = new Worker(
    `${process.env.TASKS_PREFIX}_try_assign_courier`,
    async (job) => {
        // console.log('try_assign_courier', job.data);
        await processTryAssignCourier(redisClient, db, cacheControl, job.data, tryAssignCourierQueue);
        return 'try_assign_courier';
    },
    {
        connection: redisClient,
    }
);


const trySetDailyGarantWorker = new Worker(
    `${process.env.TASKS_PREFIX}_try_set_daily_garant`,
    async (job) => {
        // console.log('try_set_daily_garant', job.data);
        await processTrySetDailyGarant(redisClient, db, cacheControl, job.data);
        return 'try_set_daily_garant';
    },
    {
        connection: redisClient,
    }
);
