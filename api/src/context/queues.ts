import { Queue } from "bullmq";
import { client } from "./redis";

export const newOrderNotify = new Queue(
    `${process.env.TASKS_PREFIX}_new_order_notify`,
    {
        connection: client,
    }
);


export const processFromBasketToCouriers = new Queue(
    `${process.env.TASKS_PREFIX}_from_basket_to_couriers`,
    {
        connection: client,
    }
);

export const processCheckAndSendYandex = new Queue(
    `${process.env.TASKS_PREFIX}_check_and_send_yandex`,
    {
        connection: client,
    }
);

export const processUpdateUserCache = new Queue(
    `${process.env.TASKS_PREFIX}_update_user_cache`,
    {
        connection: client,
    }
);

export const processOrderCompleteQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_complete`,
    {
        connection: client,
    }
);

export const processOrderEcommerceWebhookQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_ecommerce_webhook`,
    {
        connection: client,
    }
);

export const processOrderChangeStatusQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_change_status`,
    {
        connection: client,
    }
);

export const processClearCourierQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_clear_courier`,
    {
        connection: client,
    }
);

export const processOrderChangeCourierQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_change_courier`,
    {
        connection: client,
    }
);

export const processStoreLocationQueue = new Queue(
    `${process.env.TASKS_PREFIX}_courier_store_location`,
    {
        connection: client,
    }
);

export const processYandexCallbackQueue = new Queue(
    `${process.env.TASKS_PREFIX}_yandex_callback`,
    {
        connection: client,
    }
);

export const processSendNotificationQueue = new Queue(
    `${process.env.TASKS_PREFIX}_send_notification`,
    {
        connection: client,
    }
);

export const processPushCourierToQueue = new Queue(
    `${process.env.TASKS_PREFIX}_push_courier_to_queue`,
    {
        connection: client,
    }
);

export const processSetQueueLastCourier = new Queue(
    `${process.env.TASKS_PREFIX}_set_queue_last_courier`,
    {
        connection: client,
    }
);

export const processTryAssignCourier = new Queue(
    `${process.env.TASKS_PREFIX}_try_assign_courier`,
    {
        connection: client,
    }
);