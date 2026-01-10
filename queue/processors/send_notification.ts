import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import Redis from "ioredis";

interface sendNotificationData {
    tokens: string[];
    payload: {
        notification: {
            title: string;
            body: string;
        };
        content: {
            channelKey: string;
        },
        data: {
            [key: string]: any;
        }
    };
}

export const processSendNotification = async (redis: Redis, db: DB, cacheControl: CacheControlService, data: sendNotificationData) => {
    const tokens = data.tokens;
    const payload = data.payload;


    const serverKey = process.env.FCM_SERVER_KEY!;
    const message = {
        notification: {
            title: payload.notification.title,
            body: payload.notification.body,
            android_channel_id: 'order_notifications_v2',
            sound: 'notify',
        },
        data: payload.data,
        priority: 'high',
        android: {
            priority: 'high',
            notification: {
                channel_id: 'order_notifications_v2',
                sound: 'notify',
            }
        },
        mutable_content: true,
        apns: {
            payload: {
                aps: {
                    sound: 'notify.wav',
                },
            },
        },
        to: '',
        content: {
            channelKey: payload.content.channelKey || 'new_order',
        },
    };

    if (tokens.length > 0) {
        for (const deviceId of tokens) {
            message.to = deviceId!;
            try {
                const responseJson = await fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    body: JSON.stringify(message),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `key=${serverKey}`,
                    }
                });

                const response = await responseJson.json();
                console.log('response', response);
                return {
                    failureCount: response.failure,
                    successCount: response.success,
                };
            } catch (e) {
                console.log(e);
            }
        }
    }
}