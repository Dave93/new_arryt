import { db } from "../lib/db";
import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { CacheControlService } from "../modules/cache/service";
import { verifyJwt } from "../utils/bcrypt";
import { SearchService } from "../services/search/service";
import { UserContext, UserResponseDto } from "../modules/user/users.dto";
import { client } from "./redis";
import { Queue } from "bullmq";
// Initialize services
export const cacheControlService = new CacheControlService(db, client);
const searchService = new SearchService(cacheControlService, db, client);

// BullMQ keeps every job forever unless told otherwise. Without this the queues grew to
// ~720k keys in Redis (470k of them failed try_assign_courier jobs going back to 2024).
const queueRetention = {
  removeOnComplete: { count: 1000, age: 24 * 3600 },
  removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
};



export const newOrderNotify = new Queue(
  `${process.env.TASKS_PREFIX}_new_order_notify`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);


export const processFromBasketToCouriers = new Queue(
  `${process.env.TASKS_PREFIX}_from_basket_to_couriers`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processCheckAndSendYandex = new Queue(
  `${process.env.TASKS_PREFIX}_check_and_send_yandex`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processUpdateUserCache = new Queue(
  `${process.env.TASKS_PREFIX}_update_user_cache`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processOrderCompleteQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_complete`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processOrderEcommerceWebhookQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_ecommerce_webhook`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processOrderChangeStatusQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_change_status`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processClearCourierQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_clear_courier`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processOrderChangeCourierQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_change_courier`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processStoreLocationQueue = new Queue(
  `${process.env.TASKS_PREFIX}_courier_store_location`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processYandexCallbackQueue = new Queue(
  `${process.env.TASKS_PREFIX}_yandex_callback`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processCheckAndSendNoor = new Queue(
  `${process.env.TASKS_PREFIX}_check_and_send_noor`,
  {
      connection: client,
      // Noor's network path flaps (VPN/direct). The processor throws on
      // network/5xx failures so the job is retried with exponential backoff,
      // letting sends self-recover once the path is restored (~8 min window).
      defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 30000 }, // 30s, 60s, 120s, 240s
          removeOnComplete: true,
          removeOnFail: 200,
      },
  }
);

export const processNoorCallbackQueue = new Queue(
  `${process.env.TASKS_PREFIX}_noor_callback`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processCheckAndSendUzum = new Queue(
  `${process.env.TASKS_PREFIX}_check_and_send_uzum`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processUzumCallbackQueue = new Queue(
  `${process.env.TASKS_PREFIX}_uzum_callback`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processSendNotificationQueue = new Queue(
  `${process.env.TASKS_PREFIX}_send_notification`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processPushCourierToQueue = new Queue(
  `${process.env.TASKS_PREFIX}_push_courier_to_queue`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processSetQueueLastCourier = new Queue(
  `${process.env.TASKS_PREFIX}_set_queue_last_courier`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processTryAssignCourier = new Queue(
  `${process.env.TASKS_PREFIX}_try_assign_courier`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);

export const processTrySetDailyGarant = new Queue(
  `${process.env.TASKS_PREFIX}_try_set_daily_garant`,
  {
      connection: client,
      defaultJobOptions: queueRetention,
  }
);


const queues = {
  newOrderNotify,
  processFromBasketToCouriers,
  processCheckAndSendYandex,
  processUpdateUserCache,
  processOrderCompleteQueue,
  processOrderEcommerceWebhookQueue,
  processOrderChangeStatusQueue,
  
  processClearCourierQueue,
  processOrderChangeCourierQueue,
  processStoreLocationQueue,
  processYandexCallbackQueue,
  processCheckAndSendNoor,
  processNoorCallbackQueue,
  processCheckAndSendUzum,
  processUzumCallbackQueue,
  processSendNotificationQueue,
  processPushCourierToQueue,
  processSetQueueLastCourier,
  processTryAssignCourier,
  processTrySetDailyGarant
}
const baseContext = new Elysia({
  name: "baseContext"
})
  .decorate("redis", client)
  .decorate("drizzle", db)
  .decorate("cacheControl", cacheControlService)
  .decorate("searchService", searchService)
  ;
const queueContext = new Elysia({
  name: "queueContext"
})
  .decorate("queues", queues);

// Create the context with user authentication
export const contextWitUser = baseContext
  .use(queueContext)
  .macro({
      permission(permission: string) {
        if (!permission) {
          return {
            resolve: () => ({
              user: null
            })
          };
        }
        
        return {
          beforeHandle: async ({ redis, status, headers: {
            authorization
          }, cacheControl, cookie }) => {

            const cookieToken = cookie.session.value;
            const cookieRefreshToken = cookie.refreshToken.value;
            
            if (!authorization && !cookieToken && !cookieRefreshToken) {
              return status(401, {
                message: "Unauthorized"
              });
            }

            if (authorization) {
              const bearer = authorization.split(" ")[1];

              if (!bearer) {
                return status(401, {
                  message: "Unauthorized"
                });
              }
              
              try {
                const jwtResult = await verifyJwt(bearer);
                const userData = await redis.hget(
                  `${process.env.PROJECT_PREFIX}_user`,
                  jwtResult.payload.id as string
                );
                
                if (!userData) {
                  return status(401, {
                    message: "Unauthorized"
                  });
                }
                
                const userRes = JSON.parse(userData) as UserContext;
                
                if (!userRes || !userRes.access.additionalPermissions.includes(permission)) {
                  return status(403, {
                    message: "Forbidden"
                  });
                }
              } catch (e) {
                return status(401, {
                  message: "Unauthorized"
                });
              }
            } else if (cookieToken && cookieRefreshToken) {
              // Check if session exists in Redis
              let session = await redis.get(`${process.env.PROJECT_PREFIX}:session:${cookieToken}`);
              if (!session) {
                  const refreshSession = await redis.get(`${process.env.PROJECT_PREFIX}:session:${cookieRefreshToken}`);
                  if (!refreshSession) {
                      throw status(403, "Invalid session");
                  }
                  session = refreshSession;

                  const refreshSessionData = JSON.parse(refreshSession) as unknown as UserContext

                  const newSessionData = await cacheControl.setUserSession(refreshSessionData, cookieRefreshToken as string);

                  cookie.session.value = newSessionData.accessToken;
                  cookie.refreshToken.value = newSessionData.refreshToken;
                  cookie.session.domain = 'arryt.uz';
                  cookie.refreshToken.domain = 'arryt.uz';
              }

              // Parse session data
              try {
                  const sessionData = JSON.parse(session) as unknown as UserContext;
              } catch (err) {
                  throw status(500, "Invalid session data");
              }
            }
          },
          
          resolve: async ({ redis, headers: {
            authorization
          }, cookie }) => {
            
            const cookieToken = cookie.session.value;
            const cookieRefreshToken = cookie.refreshToken.value;
            
            if (!authorization && !cookieToken && !cookieRefreshToken) {
              return { user: null };
            }

            if (authorization) {
              const bearer = authorization.split(" ")[1];

              if (!bearer) {
                return { user: null };
              }

              try {
                const jwtResult = await verifyJwt(bearer);
                const userData = await redis.hget(
                  `${process.env.PROJECT_PREFIX}_user`,
                  jwtResult.payload.id as string
                );
                
                if (!userData) {
                  return { user: null };
                }
                
                const userRes = JSON.parse(userData) as UserContext;
                return { user: userRes };
              } catch (e) {
                return { user: null };
              }
            } else if (cookieToken && cookieRefreshToken) {
              const session = await redis.get(`${process.env.PROJECT_PREFIX}:session:${cookieToken}`);
              if (!session) {
                  return {
                      user: null
                  };
              }

              const sessionData = JSON.parse(session) as unknown as UserContext;

              return {
                  user: sessionData
              };
            } else {
              return { user: null };
            }
          }
        };
      },
      userAuth(enabled: boolean) {
        if (!enabled) {
          return {
            resolve: () => ({
              user: null
            })
          };
        }
        
        return {
          resolve: async ({ redis, headers: {
            authorization
          }, cookie }) => {
            
            const cookieToken = cookie.session.value;
            const cookieRefreshToken = cookie.refreshToken.value;

            if (!authorization && !cookieToken && !cookieRefreshToken) {
              return { user: null };
            }

            if (authorization) {
              const bearer = authorization.split(" ")[1];

              if (!bearer) {
                return { user: null };
              }
              try {
                const jwtResult = await verifyJwt(bearer);
                const userData = await redis.hget(
                  `${process.env.PROJECT_PREFIX}_user`,
                  jwtResult.payload.id as string
                );
                
                if (!userData) {
                  return { user: null };
                }
                
                const userRes = JSON.parse(userData) as UserContext;
                return { user: userRes };
              } catch (e) {
                return { user: null };
              }
            } else if (cookieToken && cookieRefreshToken) {
              const session = await redis.get(`${process.env.PROJECT_PREFIX}:session:${cookieToken}`);
              if (!session) {
                  return {
                      user: null
                  };
              }

              const sessionData = JSON.parse(session) as unknown as UserContext;

              return {
                  user: sessionData
              };
            } else {
              return { user: null };
            }
          }
        };
      }
    });