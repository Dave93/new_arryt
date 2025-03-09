import Elysia, { t } from "elysia";
import { db } from "@api/src/lib/db";
import {
  users,
  otp as otpTable,
  users_roles,
  roles,
  users_terminals,
  work_schedules,
  users_work_schedules,
  terminals,
  timesheet,
  courier_terminal_balance,
  work_schedule_entries,
  orders,
  order_transactions,
  manager_withdraw,
  manager_withdraw_transactions,
  courier_performances
} from "@api/drizzle/schema";
import {
  InferSelectModel,
  SQLWrapper,
  and,
  arrayContains,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  desc,
  isNotNull,
  ne,
  asc,
  not
} from "drizzle-orm";
import { generate } from "otp-generator";
import { addMinutesToDate, getHours } from "@api/src/lib/dates";
import { decode, encode } from "@api/src/utils/users";
import dayjs from "dayjs";
import { UserResponseDto } from "./users.dto";
import { JwtPayload } from "@api/src/utils/jwt-payload.dto";
import { generateAuthToken, verifyJwt } from "@api/src/utils/bcrypt";
import { SelectedFields } from "drizzle-orm/pg-core";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { createSelectSchema } from "drizzle-typebox";
import { getDistance } from "geolib";
import { sortBy, uniq } from "lodash";
import { getSetting } from "@api/src/utils/settings";

import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import { contextWitUser } from "@api/src/context";
import { CourierEfficiencyReportItem, UsersModel, WalletStatus } from "./dto/list.dto";
import { processPushCourierToQueue, processTrySetDailyGarant } from "@api/src/context/queues";
dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

type RollCallCourier = {
  id: string;

  first_name: string | null;

  drive_type?: string | null;

  last_name: string | null;

  created_at?: string | null;

  date?: string | null;

  is_late?: boolean | null;

  is_online?: boolean | null;

  phone?: string | null;

  app_version?: string | null;
};

type RollCallItem = {
  id: string;

  name: string;

  couriers: RollCallCourier[];
};

type RollCallUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_online: boolean;
  drive_type: string | null;
  phone: string;
  app_version?: string;
  daily_garant_id: string | null;
  timesheet_users: {
    id: string | null;
    date: string | null;
    created_at: string | null;
    is_late: boolean | null;
  };
};

type RollCallTerminals = {
  id: string;
  name: string;
  couriers: RollCallUser[];
};

const selectUserSchema = createSelectSchema(users);

const userByPhone = db.query.users
  .findFirst({
    where: (users, { eq }) => eq(users.phone, sql.placeholder("phone")),
  })
  .prepare("userByPhone");
const userById = db.query.users
  .findFirst({
    where: (users, { eq }) => eq(users.id, sql.placeholder("id")),
  })
  .prepare("userById");

const otpById = db.query.otp
  .findFirst({
    where: (otpTable, { eq }) => eq(otpTable.id, sql.placeholder("id")),
  })
  .prepare("otpById");

export const UsersController = new Elysia({
  name: "@app/users",
})
  .use(contextWitUser)
  .post(
    "/users/send-otp",
    async ({ body: { phone }, drizzle }) => {
      let userEntity = await userByPhone.execute({ phone });
      if (!userEntity) {
        [userEntity] = await drizzle
          .insert(users)
          .values({
            phone,
            is_super_user: false,
            status: "active",
            wallet_balance: 0,
          })
          .returning();
      }

      //Generate OTP
      let otp = generate(6, {
        digits: true,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      const now = new Date();
      const expiration_time = addMinutesToDate(now, 10);
      console.log(otp);
      if (phone == "+998977021803") {
        otp = "555555";
      }

      if (phone == "+998950771803") {
        otp = "888888";
      }

      const [otpEntity] = await db
        .insert(otpTable)
        .values({
          user_id: userEntity.id,
          otp: otp,
          expiry_date: expiration_time.toISOString(),
        })
        .returning();
      //   const otpEntity = await this.prismaService.otp.create({
      //     data: {
      //       user_id: userEntity.id,
      //       otp: otp,
      //       expiry_date: expiration_time,
      //     },
      //   });

      // Create details object containing the phone number and otp id
      const details = {
        timestamp: now,
        check: phone,
        success: true,
        message: "OTP sent to user",
        otp_id: otpEntity.id,
      };

      // Encrypt the details object
      const encoded = await encode(JSON.stringify(details));

      let message = `Your OTP is ${otp}`;

      // Send the OTP to the user
      const response = await fetch("https://send.smsxabar.uz/broker-api/send", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              recipient: phone.replace(/[^0-9]/g, ""),
              "message-id": Math.floor(Math.random() * 1000001),
              sms: {
                originator: "Chopar",
                content: {
                  text: message,
                },
              },
            },
          ],
        }),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization:
            "Basic " + Buffer.from("lesailes2:W84Uu8h@j").toString("base64"),
        },
      });
      //   let result = new SendOtpToken();
      //   result.details = encoded;
      return {
        details: encoded,
      };
    },
    {
      body: t.Object({
        phone: t.String(),
      }),
    }
  )
  .post(
    "/users/verify-otp",
    async ({
      body: { phone, otp, verificationKey, deviceToken, tgId },
      redis,
      set,
      drizzle,
    }) => {
      const currentDate = new Date();

      let decoded;

      //Check if verification key is altered or not and store it in variable decoded after decryption
      try {
        decoded = await decode(verificationKey);
      } catch (err) {
        set.status = 400;
        return {
          message: "Verification key is invalid",
        };
      }
      const obj = JSON.parse(decoded);
      const check_obj = obj.check;

      // Check if the OTP was meant for the same email or phone number for which it is being verified
      if (check_obj != phone) {
        set.status = 400;
        return {
          message: "OTP was not sent to this particular phone number",
        };
      }
      const otp_instance = await otpById.execute({ id: obj.otp_id });

      //Check if OTP is available in the DB
      if (otp_instance != null) {
        //Check if OTP is already used or not
        if (otp_instance.verified != true) {
          //Check if OTP is expired or not
          if (dayjs(currentDate).isBefore(dayjs(otp_instance.expiry_date))) {
            //Check if OTP is equal to the OTP in the DB
            if (otp === otp_instance.otp) {
              otp_instance.verified = true;
              await db
                .update(otpTable)
                .set({
                  verified: true,
                })
                .where(eq(otpTable.id, otp_instance.id))
                .execute();

              let userData = await redis.hget(
                `${process.env.PROJECT_PREFIX}_user`,
                otp_instance.user_id
              );

              if (!userData) {
                set.status = 400;
                return {
                  message: "User not found",
                };
              }

              const userParsed = JSON.parse(userData);
              const user = userParsed.user;

              if (user!.status == "blocked") {
                set.status = 400;
                return {
                  message: "User is blocked",
                };
              }
              if (user!.status == "inactive") {
                set.status = 400;
                return {
                  message: "User is inactive",
                };
              }

              if (deviceToken) {
                await drizzle
                  .update(users)
                  .set({
                    fcm_token: deviceToken,
                  })
                  .where(eq(users.id, user!.id))
                  .execute();
              }

              if (tgId) {
                await drizzle
                  .update(users)
                  .set({
                    tg_id: tgId.toString(),
                  })
                  .where(eq(users.id, user!.id))
                  .execute();
              }

              const dto: UserResponseDto = user;

              const payload: JwtPayload = {
                id: user!.id,
                phone: user!.phone,
              };
              const token = await generateAuthToken(payload);

              return {
                token,
                user: dto,
                access: userParsed.access,
              };
              // const response = { Status: 'Success', Details: 'OTP Matched', Check: check };
              // return res.status(200).send(response);
            } else {
              set.status = 400;
              return {
                message: "OTP NOT Matched",
              };
            }
          } else {
            set.status = 400;
            return {
              message: "OTP Expired",
            };
          }
        } else {
          set.status = 400;
          return {
            message: "OTP Already Used",
          };
        }
      } else {
        set.status = 400;
        return {
          message: "OTP Not Found",
        };
      }
    },
    {
      body: t.Object({
        phone: t.String(),
        otp: t.String(),
        verificationKey: t.String(),
        deviceToken: t.Optional(t.String()),
        tgId: t.Optional(t.Number()),
      }),
    }
  )
  .post(
    "/couriers/terminal_balance",
    async ({
      body: { terminal_id, courier_id, status },
      drizzle,
      user,
      set,
    }) => {
      const result = (await drizzle
        .select({
          id: courier_terminal_balance.id,
          courier_id: courier_terminal_balance.courier_id,
          terminal_id: courier_terminal_balance.terminal_id,
          balance: courier_terminal_balance.balance,
          terminals: {
            id: terminals.id,
            name: terminals.name,
          },
          users: {
            id: users.id,
            first_name: users.first_name,
            last_name: users.last_name,
            status: users.status,
            phone: users.phone,
          },
        })
        .from(courier_terminal_balance)
        .leftJoin(
          terminals,
          eq(courier_terminal_balance.terminal_id, terminals.id)
        )
        .leftJoin(users, eq(courier_terminal_balance.courier_id, users.id))
        .where(
          and(
            gt(courier_terminal_balance.balance, 0),
            terminal_id && terminal_id.length
              ? inArray(courier_terminal_balance.terminal_id, terminal_id)
              : undefined,
            courier_id && courier_id.length
              ? inArray(courier_terminal_balance.courier_id, courier_id)
              : undefined,
            status ? inArray(users.status, status) : undefined
          )
        )
        .execute()) as WalletStatus[];
      return result;
    },
    {
      permission: 'orders.edit',
      body: t.Object({
        terminal_id: t.Optional(t.Array(t.String())),
        courier_id: t.Optional(t.Array(t.String())),
        status: t.Optional(
          t.Array(
            t.Union([
              t.Literal("active"),
              t.Literal("inactive"),
              t.Literal("blocked"),
            ])
          )
        ),
      }),
    }
  )
  .post(
    "/users/refresh_token",
    async ({ body: { refresh_token }, set }) => {
      try {
        let jwtResult = await verifyJwt(refresh_token);
        const id = jwtResult.payload.id as string;
        const phone = jwtResult.payload.phone as string;

        return await generateAuthToken({
          id,
          phone,
        });
      } catch (e) {
        // console.log('refresh error', e)
        set.status = 400;
        return {
          message: "Token is invalid",
        };
      }
    },
    {
      body: t.Object({
        refresh_token: t.String(),
      }),
    }
  )
  .get("/users/getme", async ({ user }) => {
    if (!user) {
      return {
        message: "User not found",
      };
    }
    return {
      ...user,
      token: {
        accessToken: '123',
        refreshToken: '123',
        accessTokenExpires: '5h',
      }
    };
  })
  .get('/users/my_performance', async ({ user, drizzle }) => {
    if (!user) {
      return {
        message: "User not found",
      };
    }

    let currentPerformance = {
      id: '',
      courier_id: user.user.id,
      terminal_keys: null,
      rating: 0,
      delivery_count: 0,
      delivery_average_time: 0,
      position: 0,
      total_active_couriers: 0,
      created_at: '',
      created_by: '',
    } as {
      id: string;
      courier_id: string;
      terminal_keys: string | null;
      rating: number;
      delivery_count: number;
      delivery_average_time: number;
      position: number;
      total_active_couriers: number;
      created_at: string | null;
      created_by: string | null;
    };

    let previousPerformance = {
      id: '',
      courier_id: user.user.id,
      terminal_keys: null,
      rating: 0,
      delivery_count: 0,
      delivery_average_time: 0,
      position: 0,
      total_active_couriers: 0,
      created_at: '',
      created_by: '',
    } as {
      id: string;
      courier_id: string;
      terminal_keys: string | null;
      rating: number;
      delivery_count: number;
      delivery_average_time: number;
      position: number;
      total_active_couriers: number;
      created_at: string | null;
      created_by: string | null;
    };

    const performance = await drizzle.select()
      .from(courier_performances)
      .where(eq(courier_performances.courier_id, user.user.id))
      .orderBy(desc(courier_performances.created_at))
      .limit(1)
      .execute();

    if (performance.length > 0) {
      currentPerformance = performance[0];

      const previousPerformanceRecord = await drizzle.select()
        .from(courier_performances)
        .where(
          and(
            eq(courier_performances.courier_id, user.user.id),
            ne(courier_performances.id, currentPerformance.id)
          )
        )
        .orderBy(desc(courier_performances.created_at))
        .limit(1)
        .execute();

      if (previousPerformanceRecord.length > 0) {
        previousPerformance = previousPerformanceRecord[0];
      }
    }

    return {
      currentPerformance,
      previousPerformance,
    };
  })
  .post(
    "/couriers/close_time_entry",
    async ({
      body: { lat_close, lon_close },
      user,
      set,
      processUpdateUserCache,
      drizzle,
      request,
      redis
    }) => {
      console.log('lat_close', lat_close);
      // @ts-ignore
      if (user.user.status != "active") {
        set.status = 400;
        return {
          message: "User is not active",
        };
      }
      let openedTime = await drizzle
        .select({
          id: work_schedule_entries.id,
          date_start: work_schedule_entries.date_start,
        })
        .from(work_schedule_entries)
        .where(
          and(
            // @ts-ignore
            eq(work_schedule_entries.user_id, user.user.id),
            eq(work_schedule_entries.current_status, "open")
          )
        )
        .limit(1)
        .execute();

      if (openedTime.length == 0) {
        set.status = 400;
        return {
          message: "Time entry not found",
        };
      }

      const openedTimeEntry = openedTime[0];

      await drizzle
        .update(users)
        .set({
          is_online: false,
          latitude: +lat_close,
          longitude: +lon_close,
        })
        // @ts-ignore
        .where(eq(users.id, user.user.id))
        .execute();

      await processUpdateUserCache.add(
        // @ts-ignore
        user.user.id,
        {
          // @ts-ignore
          id: user.user.id,
        },
        { attempts: 3, removeOnComplete: true }
      );

      let dateStart = dayjs(openedTimeEntry.date_start);
      let dateEnd = dayjs();

      const duration = dateEnd.diff(dateStart, "seconds");

      const ip = request.headers.get("x-real-ip") || "127.0.0.1";
      await drizzle
        .update(work_schedule_entries)
        .set({
          ip_close: ip,
          lat_close: +lat_close,
          lon_close: +lon_close,
          duration: duration,
          current_status: "closed",
          date_finish: new Date().toISOString(),
        })
        .where(eq(work_schedule_entries.id, openedTimeEntry.id))
        .execute();

      // @ts-ignore
      redis.hdel(`${process.env.PROJECT_PREFIX}_user_location`, user.user.id);
      // @ts-ignore
      // await processTrySetDailyGarant.add(user.user.id, {
      //   // @ts-ignore
      //   courier_id: user.user.id,
      //   // @ts-ignore
      //   terminal_id: user.user.terminal_id,
      // }, {
      //   attempts: 3,
      //   removeOnComplete: true,
      // });

      return openedTimeEntry;
    },
    {
      permission: 'orders.list',
      body: t.Object({
        lat_close: t.String(),
        lon_close: t.String(),
      }),
    }
  )
  .post(
    "/couriers/open_time_entry",
    async ({
      body: { lat_open, lon_open },
      user,
      set,
      cacheControl,
      redis,
      processUpdateUserCache,
      drizzle,
      request,
      error,
      headers
    }) => {
      // @ts-ignore
      if (user.user.status != "active") {
        set.status = 400;
        return {
          message: "User is not active",
        };
      }

      // @ts-ignore
      const userRoles = user.access.roles;
      const userRoleCodes = userRoles.map((role: any) => role.code);

      if (!userRoleCodes.includes("courier")) {
        set.status = 400;
        return {
          message: "User is not courier",
        };
      }

      const ip = headers['x-real-ip'] || '127.0.0.1';

      const existingOpenTimeEntry = await redis.get(`${process.env.PROJECT_PREFIX}_courier_open_time_entry_${ip}`);

      if (existingOpenTimeEntry) {
        if (existingOpenTimeEntry != user.user.id) {
          set.status = 400;
          return {
            message: "Time entry already opened by another courier",
          };
        }
      } else {
        await redis.set(`${process.env.PROJECT_PREFIX}_courier_open_time_entry_${ip}`, user.user.id, 'EX', 60 * 30); // 10 minutes
      }

      const openedTimeEntry = await drizzle
        .select({
          id: work_schedule_entries.id,
        })
        .from(work_schedule_entries)
        .where(
          and(
            // @ts-ignore
            eq(work_schedule_entries.user_id, user.user.id),
            eq(work_schedule_entries.current_status, "open")
          )
        )
        .limit(1)
        .execute();

      if (openedTimeEntry.length > 0) {
        set.status = 400;
        return {
          message: "Time entry already opened",
        };
      }

      const userTerminals = await drizzle
        .select({
          terminal_id: users_terminals.terminal_id,
          terminals: {
            id: terminals.id,
            latitude: terminals.latitude,
            longitude: terminals.longitude,
            organization_id: terminals.organization_id,
          },
        })
        .from(users_terminals)
        .leftJoin(terminals, eq(users_terminals.terminal_id, terminals.id))
        // @ts-ignore
        .where(eq(users_terminals.user_id, user.user.id))
        .execute();

      if (userTerminals.length == 0) {
        set.status = 400;
        return {
          message: "User doesn't have terminals",
        };
      }

      let minDistance: number | null = null;
      let organizationId = null;
      let terminalId = null;

      console.log('lat_open', lat_open);
      console.log('lon_open', lon_open);

      userTerminals.forEach((terminal) => {
        const distance = getDistance(
          {
            latitude: terminal.terminals!.latitude,
            longitude: terminal.terminals!.longitude,
          },
          { latitude: lat_open, longitude: lon_open }
        );
        if (!minDistance || distance < minDistance) {
          minDistance = distance;
          organizationId = terminal.terminals!.organization_id;
          terminalId = terminal.terminals!.id;
        }
      });

      const organization = await cacheControl.getOrganization(organizationId!);
      console.log('minDistance', minDistance);
      console.log('organization.max_distance', organization.max_distance);
      if (minDistance! > organization.max_distance) {
        set.status = 400;
        return error(400, {
          message: "You are too far from terminal",
        });
      }
      const workSchedules = await drizzle
        .select({
          id: work_schedules.id,
          start_time: work_schedules.start_time,
          end_time: work_schedules.end_time,
          days: work_schedules.days,
          user_id: users_work_schedules.user_id,
          work_schedule_id: users_work_schedules.work_schedule_id,
          max_start_time: work_schedules.max_start_time,
        })
        .from(work_schedules)
        .leftJoin(
          users_work_schedules,
          eq(work_schedules.id, users_work_schedules.work_schedule_id)
        )
        .where(
          and(
            // @ts-ignore
            eq(users_work_schedules.user_id, user.user.id),
            arrayContains(work_schedules.days, [dayjs().isoWeekday().toString()])
          )
        )
        .execute();

      if (workSchedules.length == 0) {
        set.status = 400;
        return {
          message: "User doesn't have work schedules",
        };
      }

      const settingsWorkStartTime = getHours(
        await getSetting(redis, "work_start_time")
      );
      const settingsWorkEndTime = getHours(
        await getSetting(redis, "work_end_time")
      );
      const currentHours = new Date().getHours();

      let minStartTime: Date | null = null;
      let maxEndTime: Date | null = null;

      const formattedDay = dayjs().format("YYYY-MM-DD");

      workSchedules.forEach((schedule) => {
        const startTime = dayjs(
          `${schedule.max_start_time}`,
          "HH:mm:ss"
        ).toDate();
        const endTime = dayjs(`${schedule.end_time}`, "HH:mm:ss").toDate();
        if (currentHours < settingsWorkEndTime) {
          endTime.setMonth(new Date().getMonth());
          endTime.setDate(new Date().getDate());
          endTime.setFullYear(new Date().getFullYear());
          startTime.setMonth(new Date().getMonth());
          startTime.setDate(new Date().getDate() - 1);
          startTime.setFullYear(new Date().getFullYear());
        } else {
          startTime.setMonth(new Date().getMonth());
          startTime.setDate(new Date().getDate());
          startTime.setFullYear(new Date().getFullYear());
          if (endTime.getHours() < startTime.getHours()) {
            endTime.setMonth(new Date().getMonth());
            endTime.setDate(new Date().getDate() + 1);
            endTime.setFullYear(new Date().getFullYear());
          } else {
            endTime.setMonth(new Date().getMonth());
            endTime.setDate(new Date().getDate());
            endTime.setFullYear(new Date().getFullYear());
          }
        }
        console.log('startTime', startTime);
        console.log('endTime', endTime);
        if (!minStartTime || startTime < minStartTime) {
          minStartTime = startTime;
        }
        if (!maxEndTime || endTime > maxEndTime) {
          maxEndTime = endTime;
        }
      });

      const currentDate = new Date();
      let isLate = false;
      let lateMinutes = 0;
      if (currentDate > minStartTime!) {
        isLate = true;
        lateMinutes = Math.round(
          (currentDate.getTime() - minStartTime!.getTime()) / 60000
        );
      }
      let workSchedule: (typeof workSchedules)[0] | null = null;
      let timesheetDate: Date | null = null;
      let scheduleStartTime = null;

      workSchedules.forEach((schedule) => {
        const startTime = dayjs(
          `${schedule.max_start_time}`,
          "HH:mm:ss"
        ).toDate();
        const endTime = dayjs(`${schedule.end_time}`, "HH:mm:ss").add(5, 'hours').toDate();
        if (currentHours < settingsWorkEndTime) {
          endTime.setMonth(new Date().getMonth());
          endTime.setDate(new Date().getDate());
          endTime.setFullYear(new Date().getFullYear());
          startTime.setMonth(new Date().getMonth());
          startTime.setDate(new Date().getDate() - 1);
          startTime.setFullYear(new Date().getFullYear());
        } else {
          startTime.setMonth(new Date().getMonth());
          startTime.setDate(new Date().getDate());
          startTime.setFullYear(new Date().getFullYear());
          if (endTime.getHours() < startTime.getHours()) {
            endTime.setMonth(new Date().getMonth());
            endTime.setDate(new Date().getDate() + 1);
            endTime.setFullYear(new Date().getFullYear());
          } else {
            endTime.setMonth(new Date().getMonth());
            endTime.setDate(new Date().getDate());
            endTime.setFullYear(new Date().getFullYear());
          }
        }

        if (currentDate >= startTime && currentDate <= endTime) {
          if (!workSchedule && !timesheetDate) {
            startTime.setHours(0);
            startTime.setMinutes(0);
            startTime.setSeconds(0);
            timesheetDate = startTime;
            workSchedule = schedule;
          }
        }
      });

      if (timesheetDate) {
        const scheduleStartTime = dayjs(
          `${workSchedule!.max_start_time}`,
          "HH:mm:ss"
        ).toDate();
        if (currentDate > scheduleStartTime) {
          isLate = true;
          lateMinutes = Math.round(
            (currentDate.getTime() - scheduleStartTime.getTime()) / 60000
          );
        }
      } else {
        workSchedules.forEach((schedule) => {
          const startTime = dayjs(
            `${schedule.max_start_time}`,
            "HH:mm:ss"
          ).toDate();
          const endTime = dayjs(`${schedule.end_time}`, "HH:mm:ss").toDate();
          startTime.setHours(startTime.getHours() - 8);
          if (currentHours < settingsWorkEndTime) {
            endTime.setMonth(new Date().getMonth());
            endTime.setDate(new Date().getDate());
            endTime.setFullYear(new Date().getFullYear());
            startTime.setMonth(new Date().getMonth());
            startTime.setDate(new Date().getDate() - 1);
            startTime.setFullYear(new Date().getFullYear());
          } else {
            startTime.setMonth(new Date().getMonth());
            startTime.setDate(new Date().getDate());
            startTime.setFullYear(new Date().getFullYear());
            if (endTime.getHours() < startTime.getHours()) {
              endTime.setMonth(new Date().getMonth());
              endTime.setDate(new Date().getDate() + 1);
              endTime.setFullYear(new Date().getFullYear());
            } else {
              endTime.setMonth(new Date().getMonth());
              endTime.setDate(new Date().getDate());
              endTime.setFullYear(new Date().getFullYear());
            }
          }

          if (currentDate >= startTime && currentDate <= endTime) {
            if (!workSchedule && !timesheetDate) {
              startTime.setHours(0);
              startTime.setMinutes(0);
              startTime.setSeconds(0);
              timesheetDate = startTime;

              const scheduleStartTime = new Date(`${schedule.max_start_time}`);
              scheduleStartTime.setDate(startTime.getDate());
              scheduleStartTime.setMonth(startTime.getMonth());
              scheduleStartTime.setFullYear(startTime.getFullYear());
              if (currentDate > scheduleStartTime) {
                isLate = true;
                lateMinutes = Math.round(
                  (currentDate.getTime() - scheduleStartTime.getTime()) / 60000
                );
              }

              workSchedule = schedule;
            }
          }
        });
      }

      console.log('timesheetDate', timesheetDate);

      if (!timesheetDate) {
        set.status = 400;
        return {
          message: "График не найден",
        };
      }

      const timesheetItem = await drizzle
        .select({ id: timesheet.id })
        .from(timesheet)
        .where(
          and(
            // @ts-ignore
            eq(timesheet.user_id, user.user.id),
            eq(timesheet.date, (timesheetDate as Date).toISOString())
          )
        )
        .limit(1)
        .execute();

      if (timesheetItem.length == 0) {
        await db
          .insert(timesheet)
          .values({
            // @ts-ignore
            user_id: user.user.id,
            // @ts-ignore
            date: (timesheetDate as Date).toISOString(),
            is_late: isLate,
            late_minutes: lateMinutes,
          })
          .execute();
      }

      await drizzle
        .update(users)
        .set({
          is_online: true,
          latitude: +lat_open,
          longitude: +lon_open,
        })
        // @ts-ignore
        .where(eq(users.id, user.user.id))
        .execute();

      await processUpdateUserCache.add(
        // @ts-ignore
        user.user.id,
        {
          // @ts-ignore
          id: user.user.id,
        },
        { attempts: 3, removeOnComplete: true }
      );

      const workScheduleEntry = await drizzle
        .insert(work_schedule_entries)
        .values({
          ip_open: ip,
          lat_open: +lat_open,
          lon_open: +lon_open,
          duration: 0,
          current_status: "open",
          late: isLate,
          date_start: new Date().toISOString(),
          work_schedule_id: workSchedule!.id,
          // @ts-ignore
          user_id: user.user.id,
        })
        .returning()
        .execute();

      // @ts-ignore
      await processPushCourierToQueue.add(user.user.id, {
        // @ts-ignore
        courier_id: user.user.id,
        terminal_id: terminalId,
        workStartTime: settingsWorkStartTime,
        workEndTime: settingsWorkEndTime,
      }, { attempts: 3, removeOnComplete: true });

      return workScheduleEntry[0];
    },
    {
      permission: 'orders.list',
      body: t.Object({
        lat_open: t.String(),
        lon_open: t.String(),
      }),
    }
  )
  .post('/couriers/try_set_daily_garant', async ({ body, redis, drizzle, cacheControl, user, set, error }) => {
    const courierList = await drizzle.select({
      id: users.id,
      daily_garant_id: users.daily_garant_id
    })
      .from(users)
      .where(eq(users.id, body.courier_id))
      .execute();

    const courier = courierList.at(0);

    if (!courier) {
      return error(400, 'Courier not found');
    }

    if (!courier.daily_garant_id) {
      return error(400, 'Courier daily garant not found');
    }

    const dailyGarant = (await cacheControl.getDailyGarant()).find(d => d.id === courier.daily_garant_id);

    if (!dailyGarant) {
      return error(400, 'Daily garant not found');
    }

    let dailyGarantMaxDifference = await getSetting(redis, 'daily_garant_max_difference');

    if (!dailyGarantMaxDifference) {
      return error(400, 'Daily garant max difference not found');
    }

    dailyGarantMaxDifference = parseInt(dailyGarantMaxDifference);

    const lastWorkScheduleEntry = (await drizzle.select({
      id: work_schedule_entries.id,
      current_status: work_schedule_entries.current_status,
      created_at: work_schedule_entries.created_at,
      date_finish: work_schedule_entries.date_finish
    })
      .from(work_schedule_entries)
      .where(eq(work_schedule_entries.user_id, body.courier_id))
      .orderBy(desc(work_schedule_entries.created_at))
      .limit(1)
      .execute()).at(0);

    if (!lastWorkScheduleEntry) {
      return error(400, 'Last work schedule entry not found');
    }

    // if (lastWorkScheduleEntry.current_status === 'closed') {
    // dayjs difference in minutes should not be more than dailyGarantMaxDifference
    // if (dayjs().diff(lastWorkScheduleEntry.date_finish, 'minutes') < dailyGarantMaxDifference) {
    const settingsWorkStartTime = getHours(
      await getSetting(redis, "work_start_time")
    );
    const settingsWorkEndTime = getHours(
      await getSetting(redis, "work_end_time")
    );

    let startDate = dayjs();
    let endDate = dayjs();
    const hour = startDate.hour();
    if (hour <= settingsWorkStartTime) {
      startDate = startDate.subtract(1, 'day').hour(settingsWorkStartTime);
      endDate = endDate.hour(settingsWorkEndTime);
    } else {
      startDate = startDate.hour(settingsWorkStartTime);
      endDate = endDate.add(1, 'day').hour(settingsWorkEndTime);
    }

    const orderStatuses = await cacheControl.getOrderStatuses();
    // get only order status where finish is false or cancel is false
    const filteredOrderStatuses = orderStatuses.filter((orderStatus) => !orderStatus.finish && !orderStatus.cancel);

    const notFinishedOrders = await drizzle.select({
      id: orders.id,
    }).from(orders).where(and(
      eq(orders.courier_id, body.courier_id),
      inArray(orders.order_status_id, filteredOrderStatuses.map(orderStatus => orderStatus.id)),
      gte(orders.created_at, startDate.toISOString()),
      lte(orders.created_at, endDate.toISOString()),
    )).execute();
    if (!notFinishedOrders.length) {
      const finishedOrderStatuses = orderStatuses.filter((orderStatus) => orderStatus.finish);
      let totalEarned = 0;
      // @ts-ignore
      const finishedOrders = await drizzle.select<{ delivery_price: number }>({
        delivery_price: sql<number>`sum(${orders.delivery_price})`
      })
        .from(orders)
        .where(and(
          eq(orders.courier_id, body.courier_id),
          inArray(orders.order_status_id, finishedOrderStatuses.map(orderStatus => orderStatus.id)),
          gte(orders.created_at, startDate.toISOString()),
          lte(orders.created_at, endDate.toISOString()),
        ))
        .groupBy(orders.courier_id)
        .execute();
      totalEarned += +finishedOrders[0].delivery_price || 0;

      // @ts-ignore
      const orderTransactionsSum = await drizzle.select<{ sum: number }>({
        sum: sql<number>`sum(${order_transactions.amount})`
      })
        .from(order_transactions)
        .where(and(
          eq(order_transactions.courier_id, body.courier_id),
          gte(order_transactions.created_at, startDate.toISOString()),
          lte(order_transactions.created_at, endDate.toISOString()),
          not(eq(order_transactions.transaction_type, 'order'))
        ))
        .execute();

      totalEarned += orderTransactionsSum.at(0)?.sum || 0;
      const timesheetList = await drizzle.select({
        id: timesheet.id,
        late_minutes: timesheet.late_minutes
      })
        .from(timesheet)
        .where(eq(timesheet.user_id, body.courier_id))
        .orderBy(desc(timesheet.created_at))
        .limit(1)
        .execute();

      const lastTimesheet = timesheetList.at(0);

      const lateMinutes = lastTimesheet?.late_minutes || 0;
      const lateMinutesBy30 = lateMinutes / 30;
      const minusAmount = lateMinutesBy30 * dailyGarant.late_minus_sum;

      if (totalEarned < dailyGarant.amount) {
        dailyGarant.amount -= Math.round(totalEarned + minusAmount);

        if (dailyGarant.amount > 0) {
          const firstOrder = await drizzle.select({
            id: orders.id,
            terminal_id: orders.terminal_id,
            organization_id: orders.organization_id
          })
            .from(orders)
            .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
            .where(and(
              eq(orders.courier_id, body.courier_id),
              inArray(orders.order_status_id, finishedOrderStatuses.map(orderStatus => orderStatus.id)),
              gte(orders.created_at, startDate.toISOString()),
              lte(orders.created_at, endDate.toISOString()),
              eq(terminals.fuel_bonus, true)
            ))
            .limit(1)
            .execute();
          const order = firstOrder.at(0);
          const terminal = order?.terminal_id;
          const organization = order?.organization_id;

          if (terminal && organization) {
            let courierTerminalBalance = await drizzle.select()
              .from(courier_terminal_balance)
              .where(
                and(
                  eq(courier_terminal_balance.courier_id, body.courier_id),
                  eq(courier_terminal_balance.terminal_id, terminal),
                )
              )
              .limit(1)
              .execute();


            let startBalance = 0;
            console.log('startBalance', startBalance)
            if (courierTerminalBalance.length) {
              startBalance = courierTerminalBalance[0].balance;
            }

            const orderTransaction = await drizzle.select({
              id: order_transactions.id,
            })
              .from(order_transactions)
              .where(and(
                eq(order_transactions.transaction_type, 'daily_garant'),
                eq(order_transactions.transaction_payment_type, 'cash'),
                eq(order_transactions.courier_id, body.courier_id),
                gte(order_transactions.created_at, startDate.toISOString()),
                lte(order_transactions.created_at, endDate.toISOString()),
              ))
              .limit(1);

            if (!orderTransaction.length) {
              await drizzle.insert(order_transactions).values({
                transaction_type: 'daily_garant',
                transaction_payment_type: "cash",
                amount: dailyGarant.amount,
                courier_id: body.courier_id,
                terminal_id: terminal,
                organization_id: organization,
                balance_before: startBalance,
                balance_after: startBalance + dailyGarant.amount,
                not_paid_amount: dailyGarant.amount,
              }).execute();

              if (courierTerminalBalance.length) {
                await drizzle.update(courier_terminal_balance).set({
                  balance: startBalance + dailyGarant.amount,
                }).where(and(
                  eq(courier_terminal_balance.courier_id, body.courier_id),
                  eq(courier_terminal_balance.terminal_id, terminal),
                )).execute();
              } else {
                await drizzle.insert(courier_terminal_balance).values({
                  courier_id: body.courier_id,
                  terminal_id: terminal,
                  balance: startBalance + dailyGarant.amount,
                  organization_id: organization,
                }).execute();
              }
            }
          }
        }
      }
    }
    // }
    // }
  }, {
    permission: 'terminals.list',
    body: t.Object({
      day: t.String(),
      courier_id: t.String(),
    }),
  })
  .get(
    "/couriers/roll_coll",
    async ({ redis, query: { date }, drizzle, user, set }) => {
      const terminalsRes = await redis.get(
        `${process.env.PROJECT_PREFIX}_terminals`
      );
      let terminalsList = JSON.parse(terminalsRes || "[]") as InferSelectModel<
        typeof terminals
      >[];
      terminalsList = terminalsList.filter((terminal) => terminal.active);
      const res: {
        [key: string]: RollCallItem;
      } = {};
      terminalsList.forEach((terminal) => {
        res[terminal.id] = {
          id: terminal.id,
          name: terminal.name,
          couriers: [],
        };
      });

      const couriers = await drizzle
        .select({
          id: users.id,
          first_name: users.first_name,
          last_name: users.last_name,
          is_online: users.is_online,
          drive_type: users.drive_type,
          phone: users.phone,
          daily_garant_id: users.daily_garant_id,
          timesheet_users: {
            id: timesheet.id,
            created_at: timesheet.created_at,
            is_late: timesheet.is_late,
            date: timesheet.date,
            app_version: users.app_version,
          },
        })
        .from(users)
        .leftJoin(users_roles, eq(users.id, users_roles.user_id))
        .leftJoin(roles, eq(users_roles.role_id, roles.id))
        .leftJoin(
          timesheet,
          and(
            eq(timesheet.user_id, users.id),
            eq(
              timesheet.date,
              dayjs(date)
                .hour(0)
                .minute(0)
                .second(0)
                .millisecond(0)
                .toISOString()
            )
          )
        )
        .where(and(eq(users.status, "active"), eq(roles.code, "courier")))
        .execute();
      const userIds = couriers.map((user) => user.id);

      const usersTerminals = await drizzle
        .select({
          user_id: users_terminals.user_id,
          terminals: {
            id: terminals.id,
          },
        })
        .from(users_terminals)
        .leftJoin(terminals, eq(users_terminals.terminal_id, terminals.id))
        .where(inArray(users_terminals.user_id, userIds))
        .execute();

      let resCouriers: RollCallUser[] = [];

      for (let i = 0; i < couriers.length; i++) {
        resCouriers.push({
          ...couriers[i],
        });
      }

      for (let i = 0; i < resCouriers.length; i++) {
        let userData = await redis.hget(
          `${process.env.PROJECT_PREFIX}_user`,
          resCouriers[0].id
        );
        if (userData) {
          try {
            const userParsed = JSON.parse(userData);
            resCouriers[i].app_version = userParsed.user.app_version;
          } catch (e) { }
        }
      }

      for (let i = 0; i < usersTerminals.length; i++) {
        const userTerminal = usersTerminals[i];
        if (res[userTerminal!.terminals!.id]) {
          res[userTerminal!.terminals!.id].couriers.push(
            ...resCouriers
              .filter((user) => user.id === userTerminal.user_id)
              .map((courier) => ({
                id: courier.id,
                first_name: courier.first_name,
                last_name: courier.last_name,
                is_online: courier.is_online,
                drive_type: courier.drive_type,
                phone: courier.phone,
                created_at: courier.timesheet_users?.created_at,
                is_late: courier.timesheet_users?.is_late,
                daily_garant_id: courier.daily_garant_id,
                date: courier.timesheet_users?.date,
                app_version: courier.app_version,
              }))
          );
        }
      }

      for (let i = 0; i < Object.values(res).length; i++) {
        Object.values(res)[i].couriers = sortBy(
          Object.values(res)[i].couriers,
          ["first_name"]
        );
      }

      return sortBy(Object.values(res), ["name"]);
    },
    {
      permission: 'terminals.list',
      query: t.Object({
        date: t.String(),
      }),
    }
  )
  .get('/couriers/roll_call/:id', async ({ params: { id }, query: { startDate, endDate }, drizzle, user, set }) => {

    const items = await drizzle.select({
      id: timesheet.id,
      date: timesheet.date,
      is_late: timesheet.is_late,
      created_at: timesheet.created_at,
      late_minutes: timesheet.late_minutes,
    }).from(timesheet).where(and(
      eq(timesheet.user_id, id),
      gte(timesheet.date, startDate),
      lte(timesheet.date, endDate)
    )).orderBy(desc(timesheet.date)).execute() as InferSelectModel<typeof timesheet>[];

    return items;
  }, {
    permission: 'terminals.list',
    params: t.Object({
      id: t.String()
    }),
    query: t.Object({
      startDate: t.String(),
      endDate: t.String()
    })
  })
  .get(
    "/couriers/search",
    async ({ query: { search }, drizzle, user, set }) => {
      const { password, ...fields } = getTableColumns(users);
      const couriersList = await drizzle
        .select({
          ...fields,
        })
        .from(users)
        .leftJoin(users_roles, eq(users.id, users_roles.user_id))
        .leftJoin(roles, eq(users_roles.role_id, roles.id))
        .where(
          and(
            eq(users.status, "active"),
            eq(roles.code, "courier"),
            or(
              ilike(users.first_name, `%${search}%`),
              ilike(users.last_name, `%${search}%`),
              ilike(users.phone, `%${search}%`)
            )
          )
        )
        .execute();
      return couriersList;
    },
    {
      permission: 'orders.list',
      query: t.Object({
        search: t.String(),
      }),
    }
  )
  .get("/couriers/all", async ({ drizzle, user, set }) => {
    const { password, ...fields } = getTableColumns(users);
    const couriersList = await drizzle
      .select(fields)
      .from(users)
      .leftJoin(users_roles, eq(users.id, users_roles.user_id))
      .leftJoin(roles, eq(users_roles.role_id, roles.id))
      .where(and(eq(users.status, "active"), eq(roles.code, "courier")))
      .execute() as InferSelectModel<typeof users>[];
    return couriersList;
  }, {
    permission: 'orders.list',
  })
  .get(
    "/couriers/my_unread_notifications",
    async ({ redis, searchService, user }) => {
      if (!user) {
        return 0;
      }

      // @ts-ignore
      const res = await searchService.myUnreadNotifications(user.user);
      return res;
    }
  )
  .get(
    "/users",
    async ({
      query: { limit, offset, sort, filters, fields },
      drizzle,
      user,
      set,
    }) => {
      let res: {
        [key: string]: UsersModel;
      } = {};
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, users, {
          work_schedules,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, users, {
          work_schedules,
          users_terminals,
        });
      }
      const usersCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(...whereClause))
        .leftJoin(users_terminals, eq(users_terminals.user_id, users.id))
        .execute();

      const usersDbSelect = drizzle
        .select()
        .from(users)
        .where(and(...whereClause))
        .leftJoin(users_terminals, eq(users_terminals.user_id, users.id))
        .limit(+limit)
        .offset(+offset)
        .as("users");

      // @ts-ignore
      const usersList: UsersModel[] = await drizzle
        .select(selectFields)
        .from(usersDbSelect)
        .leftJoin(
          users_work_schedules,
          eq(users.id, users_work_schedules.user_id)
        )
        .leftJoin(
          work_schedules,
          eq(work_schedules.id, users_work_schedules.work_schedule_id)
        )
        .execute();
      usersList.forEach((user) => {
        if (!res[user.id]) {
          res[user.id] = {
            ...user,
            work_schedules: [],
          };
        }
        // @ts-ignore
        if (user.work_schedules) {
          // @ts-ignore
          res[user.id].work_schedules.push(user.work_schedules);
        }
      });

      return {
        total: usersCount[0].count,
        data: Object.values(res),
      };
    },
    {
      permission: 'users.list',
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/users/:id",
    async ({ params: { id }, query: { fields }, drizzle, user, set }) => {
      let res: {
        [key: string]: UsersModel;
      } = {};
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, users, {
          work_schedules,
          terminals,
          users_roles,
          roles
        });
      }
      const usersDbSelect = drizzle
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
        .as("users");

      // @ts-ignore
      const usersList: UsersModel[] = await drizzle
        .select(selectFields)
        .from(usersDbSelect)
        .leftJoin(
          users_work_schedules,
          eq(users.id, users_work_schedules.user_id)
        )
        .leftJoin(
          work_schedules,
          eq(work_schedules.id, users_work_schedules.work_schedule_id)
        )
        .leftJoin(
          users_roles,
          eq(users.id, users_roles.user_id)
        )
        .leftJoin(
          roles,
          eq(users_roles.role_id, roles.id)
        )
        .leftJoin(
          users_terminals,
          eq(users_terminals.user_id, users.id)
        )
        .leftJoin(
          terminals,
          eq(users_terminals.terminal_id, terminals.id)
        )
        .execute();
      usersList.forEach((user) => {
        if (!res[user.id]) {
          res[user.id] = {
            ...user,
            work_schedules: [],
            terminals: []
          };
        }
        // @ts-ignore
        if (user.work_schedules) {
          // @ts-ignore
          res[user.id].work_schedules.push(user.work_schedules);
        }

        if (user.terminals) {
          // @ts-ignore
          res[user.id].terminals.push(user.terminals);
        }

        if (user.roles) {
          res[user.id].roles = user.roles;
        }
      });

      const resultUser = Object.values(res)[0];

      if (resultUser.terminals && resultUser.terminals.length > 0) {
        // remove duplicates, check by id field
        resultUser.terminals = resultUser.terminals.filter(
          (terminal, index, self) =>
            index ===
            self.findIndex((t) => t.id === terminal.id)
        );
      }

      if (resultUser.work_schedules && resultUser.work_schedules.length > 0) {
        // remove duplicates, check by id field
        resultUser.work_schedules = resultUser.work_schedules.filter(
          (work_schedule, index, self) =>
            index ===
            self.findIndex((ws) => ws.id === work_schedule.id)
        );
      }

      return {
        data: resultUser,
      };
    },
    {
      permission: 'users.show',
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        fields: t.Optional(t.String()),
      })
    }
  )
  .post(
    "/users",
    async ({ body: { data, fields }, drizzle, user, set, cacheControl }) => {
      let selectFields = { id: users.id };
      if (fields) {
        // @ts-ignore
        selectFields = parseSelectFields(fields, users, {});
      }
      const {
        roles,
        usersTerminals,
        usersWorkSchedules,
        ...fieldValues
      } = data;

      const result = await drizzle
        .insert(users)
        .values({
          ...fieldValues,
          wallet_balance: 0,
        })
        .returning(selectFields);

      const createdUser = result[0];

      await drizzle
        .insert(users_roles)
        .values({
          user_id: createdUser.id,
          role_id: roles,
        })
        .execute();

      if (usersTerminals && usersTerminals.length > 0) {
        await drizzle
          .insert(users_terminals)
          .values(usersTerminals.map(terminal_id => ({
            user_id: createdUser.id,
            terminal_id,
          })))
          .execute();
      }

      if (usersWorkSchedules && usersWorkSchedules.length > 0) {
        await drizzle
          .insert(users_work_schedules)
          .values(usersWorkSchedules.map(work_schedule_id => ({
            user_id: createdUser.id,
            work_schedule_id,
          })))
          .execute();
      }
      await cacheControl.cacheUser(createdUser.id);
      return {
        data: createdUser,
      };
    },
    {
      permission: 'users.create',
      body: t.Object({
        data: t.Object({
          first_name: t.String(),
          last_name: t.String(),
          phone: t.String(),
          status: t.Union([
            t.Literal("active"),
            t.Literal("inactive"),
            t.Literal("blocked"),
          ]),
          drive_type: t.Optional(t.Union([t.Literal("car"), t.Literal("bike"), t.Literal("foot"), t.Literal("bycicle")])),
          roles: t.String(),
          usersTerminals: t.Optional(t.Array(t.String())),
          usersWorkSchedules: t.Optional(t.Array(t.String())),
          daily_garant_id: t.Optional(t.String()),
          max_active_order_count: t.Optional(t.Number()),
          card_name: t.Optional(t.String()),
          card_number: t.Optional(t.String()),
          car_model: t.Optional(t.String()),
          car_number: t.Optional(t.String()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/users/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, user, set, cacheControl }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, users, {});
      }
      const {
        roles,
        usersTerminals,
        usersWorkSchedules,
        doc_files,
        ...fieldValues
      } = data;

      const result = await drizzle
        .update(users)
        .set(fieldValues)
        .where(eq(users.id, id))
        .returning(selectFields);

      await drizzle.delete(users_roles).where(eq(users_roles.user_id, id)).execute();

      await drizzle
        .insert(users_roles)
        .values({
          user_id: id,
          role_id: roles,
        })
        .execute();

      if (usersTerminals) {
        await drizzle.delete(users_terminals).where(eq(users_terminals.user_id, id)).execute();
        await drizzle
          .insert(users_terminals)
          .values(usersTerminals.map(terminal_id => ({
            user_id: id,
            terminal_id,
          })))
          .execute();
      }

      if (usersWorkSchedules) {
        await drizzle.delete(users_work_schedules).where(eq(users_work_schedules.user_id, id)).execute();
        await drizzle
          .insert(users_work_schedules)
          .values(usersWorkSchedules.map(work_schedule_id => ({
            user_id: id,
            work_schedule_id,
          })))
          .execute();
      }

      await cacheControl.cacheUser(id);
      return {
        data: result[0],
      };
    },
    {
      permission: 'users.edit',
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: t.Object({
          first_name: t.String(),
          last_name: t.String(),
          phone: t.String(),
          status: t.Union([
            t.Literal("active"),
            t.Literal("inactive"),
            t.Literal("blocked"),
          ]),
          drive_type: t.Optional(t.Union([t.Literal("car"), t.Literal("bike"), t.Literal("foot"), t.Literal("bycicle")])),
          roles: t.String(),
          usersTerminals: t.Array(t.String()),
          usersWorkSchedules: t.Optional(t.Array(t.String())),
          daily_garant_id: t.Optional(t.Nullable(t.String())),
          max_active_order_count: t.Optional(t.Nullable(t.Number())),
          card_name: t.Optional(t.Nullable(t.String())),
          card_number: t.Optional(t.Nullable(t.String())),
          car_model: t.Optional(t.Nullable(t.String())),
          car_number: t.Optional(t.Nullable(t.String())),
          order_start_date: t.Optional(t.Nullable(t.String())),
          doc_files: t.Optional(t.Nullable(t.Array(t.String()))),
        }),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .post('/couriers/efficiency', async ({ body: { startDate, endDate, courier_id, terminal_id, status }, drizzle, user, set, cacheControl }) => {

    const query = await db.execute<{
      courier_id: string;
      terminal_id: string;
      hour_period: string;
      courier_count: number;
      total_count: number;
      courier_percentage: number;
    }>(sql.raw(`WITH total_orders AS (
      SELECT terminal_id,
             (CASE
                WHEN extract(hour from created_at) BETWEEN 5 AND 9 THEN '10:00-15:00'
                WHEN extract(hour from created_at) BETWEEN 10 AND 16 THEN '15:00-22:00'
                ELSE '22:00-03:00'
               END) AS hour_period,
             count(*) AS total_count
      FROM orders
      WHERE created_at BETWEEN '${dayjs(startDate).add(-5, 'hour').format('YYYY-MM-DD HH:mm:ss')}' AND '${dayjs(endDate)
        .add(-5, 'hour')
        .format('YYYY-MM-DD HH:mm:ss')}'
      ${terminal_id && terminal_id.length ? `AND terminal_id IN ('${terminal_id.join("','")}')` : ''}
      GROUP BY terminal_id, hour_period
    ), courier_orders AS (
      SELECT terminal_id, courier_id,
             (CASE
                WHEN extract(hour from created_at) BETWEEN 5 AND 9 THEN '10:00-15:00'
                WHEN extract(hour from created_at) BETWEEN 10 AND 16 THEN '15:00-22:00'
                ELSE '22:00-03:00'
               END) AS hour_period,
             count(*) AS courier_count
      FROM orders
      WHERE created_at BETWEEN '${dayjs(startDate).add(-5, 'hour').format('YYYY-MM-DD HH:mm:ss')}' AND '${dayjs(endDate)
        .add(-5, 'hour')
        .format('YYYY-MM-DD HH:mm:ss')}'
        ${courier_id ? `AND courier_id = '${courier_id}'` : ''}
        ${terminal_id && terminal_id.length ? `AND terminal_id IN ('${terminal_id.join("','")}')` : ''}
      GROUP BY terminal_id, courier_id, hour_period
    )
    SELECT courier_orders.terminal_id, courier_orders.courier_id, courier_orders.hour_period,
           courier_orders.courier_count, total_orders.total_count,
           (courier_orders.courier_count / total_orders.total_count) * 100 AS courier_percentage
    FROM total_orders
           JOIN courier_orders
                ON total_orders.terminal_id = courier_orders.terminal_id
                  AND total_orders.hour_period = courier_orders.hour_period`));

    const res: CourierEfficiencyReportItem[] = [];
    const courierIds: string[] = [];
    const terminalIds: string[] = [];

    // @ts-ignore
    query.rows.forEach((item) => {
      if (!courierIds.includes(item.courier_id)) {
        courierIds.push(item.courier_id);
      }
      if (!terminalIds.includes(item.terminal_id)) {
        terminalIds.push(item.terminal_id);
      }
    });

    // remove null values from courierIds
    const filteredCourierIds = courierIds.filter((courierId) => courierId !== null);

    let whereClause: (SQLWrapper | undefined)[] = [
    ];

    if (filteredCourierIds.length > 0) {
      whereClause.push(inArray(users.id, filteredCourierIds));
    }

    if (status && status.length) {
      whereClause.push(eq(users.status, status));
    }

    const courierData: Record<string, any> = {};
    const couriers = await drizzle.select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      phone: users.phone,
      drive_type: users.drive_type,
    }).from(users).where(and(...whereClause)).execute();
    couriers.forEach((courier) => {
      courierData[courier.id] = courier;
    });

    const terminalsList = await cacheControl.getTerminals();
    const terminalData: Record<string, InferSelectModel<typeof terminals>> = {};
    terminalsList.forEach((terminal) => {
      terminalData[terminal.id] = terminal;
    });

    const resultData: Record<string, {
      courier_id: string;
      first_name: string;
      last_name: string;
      phone: string;
      drive_type: string;
      courier_count: number;
      total_count: number;
      efficiency: number | string;
      terminals: {
        terminal_id: string;
        terminal_name: string;
        courier_count: number;
        total_count: number;
        efficiency: number;
        hour_period: string;
        courier_percentage: number;
      }[];
    }> = {};
    // @ts-ignore
    query.rows.forEach((item) => {
      const courier = courierData[item.courier_id];
      const terminal = terminalData[item.terminal_id];
      if (courier && terminal) {
        if (!resultData[item.courier_id]) {
          resultData[item.courier_id] = {
            courier_id: item.courier_id,
            first_name: courier.first_name,
            last_name: courier.last_name,
            phone: courier.phone,
            drive_type: courier.drive_type,
            courier_count: 0,
            total_count: 0,
            efficiency: 0,
            terminals: [],
          };
        }

        let couriersForPeriod: any[] | null | undefined = [];
        if (couriersForPeriod.length) {
          couriersForPeriod = couriersForPeriod.filter((courierId) => courierId !== null);
          couriersForPeriod = uniq(couriersForPeriod);
        }

        const countOfCouriers = couriersForPeriod.length;

        resultData[item.courier_id].terminals.push({
          terminal_id: item.terminal_id,
          terminal_name: terminal.name,
          courier_count: Number(item.courier_count),
          total_count: Number(item.total_count),
          efficiency: item.courier_percentage,
          hour_period: item.hour_period,
          courier_percentage: item.courier_percentage,
        });
      }
    });

    Object.keys(resultData).forEach((key) => {
      const courier = resultData[key];
      let efficiency = 0;
      courier.terminals.forEach((terminal) => {
        courier.courier_count += terminal.courier_count;
        courier.total_count += terminal.total_count;
        efficiency += +terminal.efficiency;
      });
      courier.efficiency = (efficiency / courier.terminals.length).toFixed(1);
      res.push(courier);
    });

    return res;
  }, {
    permission: 'orders.edit',
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courier_id: t.Optional(t.String()),
      terminal_id: t.Optional(t.Array(t.String())),
      status: t.Optional(t.Union([t.Literal('active'), t.Literal('inactive'), t.Literal('blocked')])),
    })
  })
  .post('/couriers/efficiency/hour', async ({ body: { startDate, endDate, courierId }, drizzle, user, set }) => {


    const usersTerminals = await drizzle.select({
      user_id: users_terminals.user_id,
      terminal_id: users_terminals.terminal_id,
    }).from(users_terminals).where(
      eq(users_terminals.user_id, courierId)
    ).execute();

    const hourEfficiencyResponse = await fetch(`${process.env.DUCK_API}/courier_efficiency/hour`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: dayjs(startDate).format('YYYY-MM-DD HH:mm:ss'),
        endDate: dayjs(endDate).format('YYYY-MM-DD HH:mm:ss'),
        terminalIds: usersTerminals.map((terminal) => terminal.terminal_id),
        courierId
      })
    })

    const data = await hourEfficiencyResponse.json();

    return data;

  }, {
    permission: 'users.edit',
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courierId: t.String()
    })
  })
  .post('/couriers/efficiency/period', async ({ body: { startDate, endDate, courierId }, drizzle, user, set }) => {


    const usersTerminals = await drizzle.select({
      user_id: users_terminals.user_id,
      terminal_id: users_terminals.terminal_id,
    }).from(users_terminals).where(
      eq(users_terminals.user_id, courierId)
    ).execute();

    const hourEfficiencyResponse = await fetch(`${process.env.DUCK_API}/courier_efficiency/period`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: dayjs(startDate).format('YYYY-MM-DD HH:mm:ss'),
        endDate: dayjs(endDate).format('YYYY-MM-DD HH:mm:ss'),
        terminalIds: usersTerminals.map((terminal) => terminal.terminal_id),
        courierId
      })
    })

    const data = await hourEfficiencyResponse.json();

    return data;

  }, {
    permission: 'users.edit',
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courierId: t.String()
    })
  })
  .get('/couriers/for_terminal', async ({ query: { terminal_id }, drizzle, user, set }) => {

    const usersTerminals = await drizzle.select({
      user_id: users_terminals.user_id,
      terminal_id: users_terminals.terminal_id,
    }).from(users_terminals).where(
      eq(users_terminals.terminal_id, terminal_id)
    ).execute();

    const userIds = usersTerminals.map((userTerminal) => userTerminal.user_id);

    const couriers = await drizzle.select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      phone: users.phone,
      drive_type: users.drive_type,
    })
      .from(users)
      .leftJoin(users_roles, eq(users.id, users_roles.user_id))
      .leftJoin(roles, eq(users_roles.role_id, roles.id))
      .where(and(
        inArray(users.id, userIds),
        eq(users.status, 'active'),
        eq(roles.code, 'courier')
      ))
      .execute();

    return couriers;
  }, {
    permission: 'users.edit',
    query: t.Object({
      terminal_id: t.String()
    })
  })
  .get('/couriers/my_profile_number', async ({ drizzle, user, set }) => {
    const sqlScorePrepare = await drizzle
      .select({
        avg_score: sql<number>`avg(score)`,
      })
      .from(orders)
      .where(and(
        eq(orders.courier_id, sql.placeholder('courierId')),
        isNotNull(orders.score),
        gte(orders.created_at, sql.placeholder('startDate')),
        lte(orders.created_at, sql.placeholder('endDate'))
      ))
      .groupBy(orders.courier_id)
      .prepare('courier_score');

    const sqlSqore = (await sqlScorePrepare.execute({
      // @ts-ignore
      courierId: user.user.id,
      startDate: dayjs().startOf('month').toISOString(),
      endDate: dayjs().endOf('month').add(1, 'day').toISOString()
    }))[0];

    const sqlTotalBalancePrepare = await drizzle
      .select({
        not_paid_amount: sql<number>`sum(not_paid_amount)`,
      })
      .from(order_transactions)
      .where(and(
        eq(order_transactions.courier_id, sql.placeholder('courierId')),
        gte(order_transactions.created_at, sql.placeholder('startDate')),
        lte(order_transactions.created_at, sql.placeholder('endDate')),
        eq(order_transactions.status, 'pending'),
        ne(order_transactions.transaction_type, 'work_schedule_bonus')
      ))
      .prepare('courier_total_balance');

    const sqlTotalBalance = (await sqlTotalBalancePrepare.execute({
      // @ts-ignore
      courierId: user.user.id,
      startDate: dayjs().subtract(45, 'day').toISOString(),
      endDate: dayjs().add(10, 'day').toISOString()
    }))[0];
    const sqlTotalFuelPrepare = await drizzle
      .select({
        amount: sql<number>`sum(amount)`,
      })
      .from(order_transactions)
      .where(and(
        eq(order_transactions.courier_id, sql.placeholder('courierId')),
        gte(order_transactions.created_at, sql.placeholder('startDate')),
        lte(order_transactions.created_at, sql.placeholder('endDate')),
        eq(order_transactions.status, 'pending'),
        eq(order_transactions.transaction_type, 'work_schedule_bonus')
      ))
      .prepare('courier_total_fuel');

    const sqlTotalFuel = (await sqlTotalFuelPrepare.execute({
      // @ts-ignore
      courierId: user.user.id,
      startDate: dayjs().subtract(45, 'day').toISOString(),
      endDate: dayjs().add(10, 'day').toISOString()
    }))[0];

    // const numbersResponse = await fetch(`${process.env.DUCK_API}/couriers/profile_numbers`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     courierId: user.user.id
    //   })
    // });

    // const numbers = await numbersResponse.json();

    return {
      score: +sqlSqore?.avg_score || 0,
      not_paid_amount: +sqlTotalBalance?.not_paid_amount || 0,
      fuel: +sqlTotalFuel?.amount || 0
    };
  }, {
    permission: 'orders.list',
  })
  .get('/couriers/mob_stat', async ({ drizzle, user, set, redis, cacheControl }) => {
    let workStartHour = await getSetting(redis, "work_start_time");
    workStartHour = new Date(workStartHour).getHours();

    let workEndHour = await getSetting(redis, "work_end_time");
    workEndHour = new Date(workEndHour).getHours();

    const orderStatuses = await cacheControl.getOrderStatuses();

    const finishedStatusIds = orderStatuses.filter((status) => status.finish).map((status) => status.id);
    const canceledStatusIds = orderStatuses.filter((status) => status.cancel).map((status) => status.id);

    const currentHour = dayjs().hour();
    // today queries
    let fromDate = dayjs().startOf("day").hour(workStartHour);
    let toDate = dayjs().add(1, 'day').startOf("day").hour(workEndHour);
    if (currentHour < workStartHour) {
      fromDate = fromDate.subtract(1, "day").startOf('day').hour(workStartHour);
      toDate = dayjs().startOf("day").hour(workEndHour);
    }
    const finishedStatusIdsSql = sql.raw(`order_status_id in ('${finishedStatusIds.join("','")}')`);
    const canceledStatusIdsSql = sql.raw(`order_status_id in ('${canceledStatusIds.join("','")}')`);

    // @ts-ignore
    const courierIdSql = sql.raw(user.user.id);

    const fromTodayDateSql = sql.raw(fromDate.toISOString());
    const toTodayDateSql = sql.raw(toDate.toISOString());
    const sqlTodayFinishedOrdersCountQuery = (await drizzle.execute<{ count: number }>(
      sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromTodayDateSql}' AND created_at <= '${toTodayDateSql}'`
    )).rows[0];
    const sqlTodayCanceledOrdersCountQuery = (await drizzle
      .execute<
        { count: number }
      >(
        sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${canceledStatusIdsSql} AND created_at >= '${fromTodayDateSql}' AND created_at <= '${toTodayDateSql}'`
      )).rows[0];
    const sqlTodayFinishedOrdersAmountQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(delivery_price) as amount
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromTodayDateSql}' AND created_at <= '${toTodayDateSql}'`
      )).rows[0];

    // yesterday queries
    fromDate = dayjs().subtract(1, "day").startOf("day").hour(workStartHour);
    toDate = dayjs().startOf("day").hour(workEndHour);

    if (currentHour < workStartHour) {
      fromDate = fromDate.subtract(1, "day").startOf('day').hour(workStartHour);
      toDate = toDate.subtract(1, "day").startOf('day').hour(workEndHour);
    }

    const fromYesterdayDateSql = sql.raw(fromDate.toISOString());
    const toYesterdayDateSql = sql.raw(toDate.toISOString());

    const sqlYesterdayFinishedOrdersCountQuery = (await drizzle
      .execute<
        { count: number }
      >(
        sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromYesterdayDateSql}' AND created_at <= '${toYesterdayDateSql}'`
      )).rows[0];
    const sqlYesterdayCanceledOrdersCountQuery = (await drizzle
      .execute<
        { count: number }
      >(
        sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${canceledStatusIdsSql} AND created_at >= '${fromYesterdayDateSql}' AND created_at <= '${toYesterdayDateSql}'`
      )).rows[0];

    const sqlYesterdayFinishedOrdersAmountQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(delivery_price) as amount
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromYesterdayDateSql}' AND created_at <= '${toYesterdayDateSql}'`
      )).rows[0];

    // week queries
    fromDate = dayjs().startOf("week").hour(workStartHour);
    toDate = dayjs().endOf("week").add(1, "day").hour(workEndHour);

    const fromWeekDateSql = sql.raw(fromDate.toISOString());
    const toWeekDateSql = sql.raw(toDate.toISOString());

    const sqlWeekFinishedOrdersCountQuery = (await drizzle
      .execute<
        { count: number }
      >(
        sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromWeekDateSql}' AND created_at <= '${toWeekDateSql}'`
      )).rows[0];

    const sqlWeekCanceledOrdersCountQuery = (await drizzle
      .execute<
        { count: number }
      >(
        sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${canceledStatusIdsSql} AND created_at >= '${fromWeekDateSql}' AND created_at <= '${toWeekDateSql}'`
      )).rows[0];

    const sqlWeekFinishedOrdersAmountQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(delivery_price) as amount
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromWeekDateSql}' AND created_at <= '${toWeekDateSql}'`
      )).rows[0];

    // month queries
    fromDate = dayjs().startOf("month").hour(workStartHour);
    toDate = dayjs().endOf("month").add(1, "day").hour(workEndHour);

    const fromMonthDateSql = sql.raw(fromDate.toISOString());
    const toMonthDateSql = sql.raw(toDate.toISOString());

    const sqlMonthFinishedOrdersCountQuery = (await drizzle
      .execute<
        { count: number }
      >(
        sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromMonthDateSql}' AND created_at <= '${toMonthDateSql}'`
      )).rows[0];

    const sqlMonthCanceledOrdersCountQuery = (await drizzle
      .execute<
        { count: number }
      >(
        sql`SELECT count(*) as count
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${canceledStatusIdsSql} AND created_at >= '${fromMonthDateSql}' AND created_at <= '${toMonthDateSql}'`
      )).rows[0];

    const sqlMonthFinishedOrdersAmountQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(delivery_price) as amount
                FROM orders
                WHERE courier_id = '${courierIdSql}' 
                AND ${finishedStatusIdsSql} AND created_at >= '${fromMonthDateSql}' AND created_at <= '${toMonthDateSql}'`
      )).rows[0];

    // today bonus queries
    const sqlTodayBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromTodayDateSql}' AND created_at <= '${toTodayDateSql}' and transaction_type = 'order_bonus'`
      )).rows[0];

    // yesterday bonus queries
    const sqlYesterdayBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromYesterdayDateSql}' AND created_at <= '${toYesterdayDateSql}' and transaction_type = 'order_bonus'`
      )).rows[0];

    // week bonus queries
    const sqlWeekBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromWeekDateSql}' AND created_at <= '${toWeekDateSql}' and transaction_type = 'order_bonus'`
      )).rows[0];

    // month bonus queries
    const sqlMonthBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromMonthDateSql}' AND created_at <= '${toMonthDateSql}' and transaction_type = 'order_bonus'`
      )).rows[0];

    // today daily garant queries
    const sqlTodayDailyGarantQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromTodayDateSql}' AND created_at <= '${toTodayDateSql}' and transaction_type = 'daily_garant'`
      )).rows[0];

    // yesterday daily garant queries
    const sqlYesterdayDailyGarantQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromYesterdayDateSql}' AND created_at <= '${toYesterdayDateSql}' and transaction_type = 'daily_garant'`
      )).rows[0];

    // week daily garant queries
    const sqlWeekDailyGarantQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromWeekDateSql}' AND created_at <= '${toWeekDateSql}' and transaction_type = 'daily_garant'`
      )).rows[0];

    // month daily garant queries
    const sqlMonthDailyGarantQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromMonthDateSql}' AND created_at <= '${toMonthDateSql}' and transaction_type = 'daily_garant'`
      )).rows[0];

    // today work_schedule_bonus queries
    const sqlTodayWorkScheduleBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromTodayDateSql}' AND created_at <= '${toTodayDateSql}' and transaction_type = 'work_schedule_bonus'`
      )).rows[0];

    // yesterday work_schedule_bonus queries
    const sqlYesterdayWorkScheduleBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromYesterdayDateSql}' AND created_at <= '${toYesterdayDateSql}' and transaction_type = 'work_schedule_bonus'`
      )).rows[0];

    // week work_schedule_bonus queries
    const sqlWeekWorkScheduleBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromWeekDateSql}' AND created_at <= '${toWeekDateSql}' and transaction_type = 'work_schedule_bonus'`
      )).rows[0];

    // month work_schedule_bonus queries
    const sqlMonthWorkScheduleBonusQuery = (await drizzle
      .execute<
        { amount: number }
      >(
        sql`SELECT sum(amount) as amount
                FROM order_transactions
                WHERE courier_id = '${courierIdSql}' 
                AND created_at >= '${fromMonthDateSql}' AND created_at <= '${toMonthDateSql}' and transaction_type = 'work_schedule_bonus'`
      )).rows[0];


    // const numbersResponse = await fetch(`${process.env.DUCK_API}/couriers/mobile_stats`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     courierId: user.user.id,
    //     startHour: workStartHour,
    //     endHour: workEndHour,
    //     finishedStatusIds,
    //     canceledStatusIds
    //   })
    // });

    // const numbers = await numbersResponse.json();

    // return numbers;

    return {
      today: {
        finishedOrdersCount: sqlTodayFinishedOrdersCountQuery.count ? Number(sqlTodayFinishedOrdersCountQuery.count) : 0,
        canceledOrdersCount: sqlTodayCanceledOrdersCountQuery.count ? Number(sqlTodayCanceledOrdersCountQuery.count) : 0,
        finishedOrdersAmount: sqlTodayFinishedOrdersAmountQuery.amount ? Number(sqlTodayFinishedOrdersAmountQuery.amount) : 0,
        bonus: sqlTodayBonusQuery.amount ? Number(sqlTodayBonusQuery.amount) : 0,
        dailyGarant: sqlTodayDailyGarantQuery.amount ? Number(sqlTodayDailyGarantQuery.amount) : 0,
        workScheduleBonus: sqlTodayWorkScheduleBonusQuery.amount ? Number(sqlTodayWorkScheduleBonusQuery.amount) : 0
      },
      yesterday: {
        finishedOrdersCount: sqlYesterdayFinishedOrdersCountQuery.count ? Number(sqlYesterdayFinishedOrdersCountQuery.count) : 0,
        canceledOrdersCount: sqlYesterdayCanceledOrdersCountQuery.count ? Number(sqlYesterdayCanceledOrdersCountQuery.count) : 0,
        finishedOrdersAmount: sqlYesterdayFinishedOrdersAmountQuery.amount ? Number(sqlYesterdayFinishedOrdersAmountQuery.amount) : 0,
        bonus: sqlYesterdayBonusQuery.amount ? Number(sqlYesterdayBonusQuery.amount) : 0,
        dailyGarant: sqlYesterdayDailyGarantQuery.amount ? Number(sqlYesterdayDailyGarantQuery.amount) : 0,
        workScheduleBonus: sqlYesterdayWorkScheduleBonusQuery.amount ? Number(sqlYesterdayWorkScheduleBonusQuery.amount) : 0
      },
      week: {
        finishedOrdersCount: sqlWeekFinishedOrdersCountQuery.count ? Number(sqlWeekFinishedOrdersCountQuery.count) : 0,
        canceledOrdersCount: sqlWeekCanceledOrdersCountQuery.count ? Number(sqlWeekCanceledOrdersCountQuery.count) : 0,
        finishedOrdersAmount: sqlWeekFinishedOrdersAmountQuery.amount ? Number(sqlWeekFinishedOrdersAmountQuery.amount) : 0,
        bonus: sqlWeekBonusQuery.amount ? Number(sqlWeekBonusQuery.amount) : 0,
        dailyGarant: sqlWeekDailyGarantQuery.amount ? Number(sqlWeekDailyGarantQuery.amount) : 0,
        workScheduleBonus: sqlWeekWorkScheduleBonusQuery.amount ? Number(sqlWeekWorkScheduleBonusQuery.amount) : 0
      },
      month: {
        finishedOrdersCount: sqlMonthFinishedOrdersCountQuery.count ? Number(sqlMonthFinishedOrdersCountQuery.count) : 0,
        canceledOrdersCount: sqlMonthCanceledOrdersCountQuery.count ? Number(sqlMonthCanceledOrdersCountQuery.count) : 0,
        finishedOrdersAmount: sqlMonthFinishedOrdersAmountQuery.amount ? Number(sqlMonthFinishedOrdersAmountQuery.amount) : 0,
        bonus: sqlMonthBonusQuery.amount ? Number(sqlMonthBonusQuery.amount) : 0,
        dailyGarant: sqlMonthDailyGarantQuery.amount ? Number(sqlMonthDailyGarantQuery.amount) : 0,
        workScheduleBonus: sqlMonthWorkScheduleBonusQuery.amount ? Number(sqlMonthWorkScheduleBonusQuery.amount) : 0
      }
    }
  }, {
    permission: 'orders.list',
  })
  .get('/couriers/my_couriers', async ({ drizzle, user, set, cacheControl }) => {

    // @ts-ignore
    const managerRole = user.access.roles.find(role => role.code === "manager");

    if (!managerRole) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }

    const usersTerminals = await drizzle.select({
      user_id: users_terminals.user_id,
      terminal_id: users_terminals.terminal_id,
    }).from(users_terminals).where(
      // @ts-ignore
      eq(users_terminals.user_id, user.user.id)
    ).execute();

    const terminalIds = usersTerminals.map((userTerminal) => userTerminal.terminal_id);

    const couriers = await drizzle.select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      phone: users.phone,
      drive_type: users.drive_type,
    })
      .from(users)
      .leftJoin(users_roles, eq(users.id, users_roles.user_id))
      .leftJoin(roles, eq(users_roles.role_id, roles.id))
      .leftJoin(users_terminals, eq(users.id, users_terminals.user_id))
      .where(and(
        inArray(users_terminals.terminal_id, terminalIds),
        eq(users.status, 'active'),
        eq(roles.code, 'courier')
      ))
      .execute();

    // remove duplicates, check by id field
    const uniqueCouriers = couriers.filter((courier, index, self) =>
      index === self.findIndex((c) => c.id === courier.id)
    );

    return uniqueCouriers;
  }, {
    permission: 'orders.list',
  })
  .get('/couriers/my_couriers/balance', async ({ user, drizzle, set }) => {


    const userTerminalsList = await drizzle.select({
      terminal_id: users_terminals.terminal_id,
    }).from(users_terminals).where(
      // @ts-ignore
      eq(users_terminals.user_id, user.user.id)
    ).execute();

    const courierTerminalBalance = await drizzle
      .select({
        id: courier_terminal_balance.id,
        phone: users.phone,
        balance: courier_terminal_balance.balance,
        terminal_id: courier_terminal_balance.terminal_id,
        terminal_name: terminals.name,
        courier_id: users.id,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(courier_terminal_balance)
      .leftJoin(terminals, eq(courier_terminal_balance.terminal_id, terminals.id))
      .leftJoin(users, eq(courier_terminal_balance.courier_id, users.id))
      .where(
        and(
          inArray(courier_terminal_balance.terminal_id, userTerminalsList.map((userTerminal) => userTerminal.terminal_id)),
          gt(courier_terminal_balance.balance, 0)
        )
      )
      .execute();
    return courierTerminalBalance;
  }, {
    permission: 'orders.list',
  })
  .post('/couriers/store-location', async ({ body: { lat, lon, app_version }, drizzle, user, set, processStoreLocationQueue }) => {

    // @ts-ignore
    if (!user.user.is_online) {
      return {
        success: true,
      }
    }

    await processStoreLocationQueue.add(`${lat}_${lon}_${new Date().getTime()}`, {
      lat,
      lon,
      app_version,
      // @ts-ignore
      user_id: user.user.id
    }, {
      attempts: 3, removeOnComplete: true

    });

    return {
      message: "Location updated",
      success: true
    };
  }, {
    permission: 'orders.list',
    body: t.Object({
      lat: t.String(),
      lon: t.String(),
      app_version: t.String()
    })
  })
  .get('/couriers/locations', async ({ user, redis }) => {

    const locations = await redis.hgetall(
      `${process.env.PROJECT_PREFIX}_user_location`
    );

    const users = await redis.hgetall(
      `${process.env.PROJECT_PREFIX}_user`
    );

    let res: {
      id: string;
      last_name: string;
      first_name: string;
      phone: string;
      short_name: string;
      is_online: boolean;
      latitude: number;
      longitude: number;
    }[] = [];

    for (let key in locations) {
      const user = JSON.parse(users[key]);
      const location = JSON.parse(locations[key]);
      if (user) {
        res.push({
          id: user.user.id,
          last_name: user.user.last_name,
          first_name: user.user.first_name,
          phone: user.user.phone,
          short_name: `${user.user.first_name[0]}. ${user.user.last_name[0]}.`,
          is_online: user.user.is_online,
          latitude: location.lat,
          longitude: location.lon,
        });
      }
    }

    return res;
  }, {
    permission: 'orders.edit',
  })
  .get('/couriers/terminal_balance', async ({ user, drizzle, set }) => {
    const courierTerminalBalancePrepare = drizzle
      .select({
        id: courier_terminal_balance.id,
        balance: courier_terminal_balance.balance,
        terminal_id: courier_terminal_balance.terminal_id,
        terminal_name: terminals.name,
        terminal_address: terminals.address,
      })
      .from(courier_terminal_balance)
      .leftJoin(terminals, eq(courier_terminal_balance.terminal_id, terminals.id))
      .where(
        and(
          eq(courier_terminal_balance.courier_id, sql.placeholder('courier_id')),
          gt(courier_terminal_balance.balance, 0)
        )
      )
      .prepare('courier_terminal_balance_by_courier_id');

    const courierTerminalBalance = await courierTerminalBalancePrepare.execute({
      // @ts-ignore
      courier_id: user.user.id
    });
    return courierTerminalBalance;
  }, {
    permission: 'orders.list',
  })
  .get('/couriers/:id/:terminal_id/balance', async ({ user, drizzle, set, params: { id, terminal_id } }) => {
    const courierTransactionsPrepare = drizzle.select({
      id: order_transactions.id,
      not_paid_amount: order_transactions.not_paid_amount,
      created_at: order_transactions.created_at,
      transaction_type: order_transactions.transaction_type,
      order_transactions_terminals: {
        name: terminals.name,
      },
      order_id: order_transactions.order_id,
    }).from(order_transactions)
      .leftJoin(terminals, eq(order_transactions.terminal_id, terminals.id))
      .where(
        and(
          eq(order_transactions.courier_id, sql.placeholder('courier_id')),
          eq(order_transactions.terminal_id, sql.placeholder('terminal_id')),
          eq(order_transactions.status, 'pending'),
          gte(order_transactions.created_at, dayjs().subtract(1, 'month').toISOString()),
          lte(order_transactions.created_at, dayjs().toISOString())
        )
      )
      .orderBy(desc(order_transactions.created_at))
      .prepare('order_transactions_by_courier_id_and_terminal_id');

    const courierTerminalBalance = await courierTransactionsPrepare.execute({
      courier_id: id,
      terminal_id: terminal_id
    });

    const orderIds = courierTerminalBalance.map((transaction) => transaction.order_id).filter((orderId) => orderId !== null) as string[];

    // get min and max created_at
    const maxCreatedAt = dayjs(courierTerminalBalance[0].created_at).add(1, 'day').toISOString();
    const minCreatedAt = dayjs(courierTerminalBalance[courierTerminalBalance.length - 1].created_at).subtract(1, 'day').toISOString();
    const ordersList = await drizzle.select({
      id: orders.id,
      order_number: orders.order_number,
    }).from(orders)
      .where(
        and(
          inArray(orders.id, orderIds),
          gte(orders.created_at, minCreatedAt),
          lte(orders.created_at, maxCreatedAt)
        )
      )
      .execute();

    courierTerminalBalance.forEach((balance) => {
      const orderNumber = ordersList.find((order) => order.id === balance.order_id)?.order_number;
      if (orderNumber) {
        // @ts-ignore
        balance.order_transactions_orders = {
          order_number: orderNumber
        };
      } else {
        // @ts-ignore
        balance.order_transactions_orders = {
          order_number: ''
        };
      }
    });


    return courierTerminalBalance;
  }, {
    permission: 'orders.list',
    params: t.Object({
      id: t.String(),
      terminal_id: t.String()
    })
  })
  .post('/couriers/withdraw', async ({ user, drizzle, set, redis, error, body: { amount, terminal_id, courier_id } }) => {
    const courierBalance = await drizzle.select({
      id: courier_terminal_balance.id,
      balance: courier_terminal_balance.balance,
      organization_id: courier_terminal_balance.organization_id,
    }).from(courier_terminal_balance).where(
      and(
        eq(courier_terminal_balance.courier_id, courier_id),
        eq(courier_terminal_balance.terminal_id, terminal_id)
      )
    ).execute();


    if (!courierBalance.length) {
      return error(404, {
        message: "Courier balance not found"
      });
    }

    if (courierBalance[0].balance < amount) {
      return error(400, {
        message: "Сумма вывода больше чем сумма на балансе"
      });
    }



    const newBalance = courierBalance[0].balance - amount;

    const settingsWorkStartTime = getHours(
      await getSetting(redis, "work_start_time")
    );
    const settingsWorkEndTime = getHours(
      await getSetting(redis, "work_end_time")
    );

    const currentTime = dayjs().hour();

    let currentDate = dayjs().toISOString();

    if (currentTime < settingsWorkEndTime) {
      currentDate = dayjs().subtract(1, 'day').toISOString();
    }

    const managerWithdraw = await drizzle.insert(manager_withdraw).values({
      amount,
      terminal_id,
      courier_id,
      created_at: currentDate,
      payed_date: currentDate,
      // @ts-ignore
      manager_id: user.user.id,
      organization_id: courierBalance[0].organization_id,
      amount_before: courierBalance[0].balance,
      amount_after: newBalance
    })
      .returning({
        id: manager_withdraw.id,
      })
      .execute();


    await drizzle.update(courier_terminal_balance).set({
      balance: newBalance
    }).where(
      and(
        eq(courier_terminal_balance.id, courierBalance[0].id),
      )
    ).execute();


    const orderTransactions = await drizzle.select({
      id: order_transactions.id,
      not_paid_amount: order_transactions.not_paid_amount,
      created_at: order_transactions.created_at,
      status: order_transactions.status,
      transaction_created_at: order_transactions.created_at,
    }).from(order_transactions)
      .where(
        and(
          eq(order_transactions.courier_id, courier_id),
          eq(order_transactions.terminal_id, terminal_id),
          gt(order_transactions.not_paid_amount, 0),
          eq(order_transactions.status, 'pending')
        )
      )
      .orderBy(asc(order_transactions.created_at))
      .execute();

    let amountToWithdraw = amount;
    for (const order_transaction of orderTransactions) {
      if (amountToWithdraw > 0) {
        if (amountToWithdraw >= order_transaction.not_paid_amount) {
          amountToWithdraw = amountToWithdraw - order_transaction.not_paid_amount;

          await drizzle.insert(manager_withdraw_transactions).values({
            amount: order_transaction.not_paid_amount,
            withdraw_id: managerWithdraw[0].id,
            transaction_id: order_transaction.id,
            transaction_created_at: order_transaction.created_at,
            payed_date: currentDate,
          }).execute();

          await drizzle.update(order_transactions).set({
            not_paid_amount: 0,
            status: 'success',
          }).where(
            eq(order_transactions.id, order_transaction.id)
          ).execute();
        } else {
          await drizzle.insert(manager_withdraw_transactions).values({
            amount: amountToWithdraw,
            withdraw_id: managerWithdraw[0].id,
            transaction_id: order_transaction.id,
            payed_date: currentDate,
            transaction_created_at: order_transaction.created_at,
          }).execute();

          await drizzle.update(order_transactions).set({
            not_paid_amount: order_transaction.not_paid_amount - amountToWithdraw,
          }).where(
            eq(order_transactions.id, order_transaction.id)
          ).execute();
          amountToWithdraw = 0;
        }
      }
    }
  }, {
    permission: 'order_transactions.list',
    body: t.Object({
      amount: t.Number(),
      terminal_id: t.String(),
      courier_id: t.String()
    })
  })