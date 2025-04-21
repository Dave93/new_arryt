import { db } from "../lib/db";
import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { CacheControlService } from "../modules/cache/service";
import { verifyJwt } from "../utils/bcrypt";
import { SearchService } from "../services/search/service";
import { UserResponseDto } from "../modules/user/users.dto";
import { client } from "./redis";
import { Queue } from "bullmq";
// Initialize services
export const cacheControlService = new CacheControlService(db, client);
const searchService = new SearchService(cacheControlService, db, client);

// Define user context type for better type safety
type UserContext = {
  user: UserResponseDto;
  access: {
    additionalPermissions: string[];
    roles: {
      name: string;
      code: string;
      active: boolean;
    }[];
  };
} | null;


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

export const processTrySetDailyGarant = new Queue(
  `${process.env.TASKS_PREFIX}_try_set_daily_garant`,
  {
      connection: client,
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
          beforeHandle: async ({ redis, error, headers: {
            authorization
          }, cacheControl, cookie }) => {

            const cookieToken = cookie.session.value;
            const cookieRefreshToken = cookie.refreshToken.value;
            
            if (!authorization && !cookieToken && !cookieRefreshToken) {
              return error(401, {
                message: "Unauthorized"
              });
            }

            if (authorization) {
              const bearer = authorization.split(" ")[1];

              if (!bearer) {
                return error(401, {
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
                  return error(401, {
                    message: "Unauthorized"
                  });
                }
                
                const userRes = JSON.parse(userData) as UserContext;
                
                if (!userRes || !userRes.access.additionalPermissions.includes(permission)) {
                  return error(403, {
                    message: "Forbidden"
                  });
                }
              } catch (e) {
                return error(401, {
                  message: "Unauthorized"
                });
              }
            } else if (cookieToken && cookieRefreshToken) {
              // Check if session exists in Redis
              let session = await redis.get(`${process.env.PROJECT_PREFIX}:session:${cookieToken}`);
              if (!session) {
                  const refreshSession = await redis.get(`${process.env.PROJECT_PREFIX}:session:${cookieRefreshToken}`);
                  if (!refreshSession) {
                      throw error(403, "Invalid session");
                  }
                  session = refreshSession;

                  const refreshSessionData = JSON.parse(refreshSession) as unknown as UserContext

                  const newSessionData = await cacheControl.setUserSession(refreshSessionData, cookieRefreshToken);

                  cookie.session.value = newSessionData.accessToken;
                  cookie.refreshToken.value = newSessionData.refreshToken;
                  cookie.session.domain = 'arryt.uz';
                  cookie.refreshToken.domain = 'arryt.uz';
              }

              // Parse session data
              try {
                  const sessionData = JSON.parse(session) as unknown as UserContext;
              } catch (err) {
                  throw error(500, "Invalid session data");
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

            console.log(`cookieToken: ${cookieToken}`);
            console.log(`cookieRefreshToken: ${cookieRefreshToken}`);

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