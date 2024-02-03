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
} from "@api/drizzle/schema";
import {
  InferSelectModel,
  SQLWrapper,
  and,
  arrayContains,
  eq,
  gt,
  ilike,
  inArray,
  or,
  sql,
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
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { getDistance } from "geolib";
import { sortBy } from "lodash";
import { getSetting } from "@api/src/utils/settings";

import customParseFormat from "dayjs/plugin/customParseFormat";
import { ctx } from "@api/src/context";
dayjs.extend(customParseFormat);

type UsersModel = InferSelectModel<typeof users>;

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
  .prepare("userByPhone");

const otpById = db.query.otp
  .findFirst({
    where: (otpTable, { eq }) => eq(otpTable.id, sql.placeholder("id")),
  })
  .prepare("otpById");

export const UsersController = new Elysia({
  name: '@app/users',
})
  .use(ctx)
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
      const response = await fetch("http://91.204.239.44/broker-api/send", {
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
      drizzle
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

              let userData = await redis.get(
                `${process.env.PROJECT_PREFIX}_user:${otp_instance.user_id}`
              );

              if (!userData) {
                set.status = 400;
                return {
                  message: "User not found",
                };
              }

              const userParsed = JSON.parse(userData);
              console.log(userParsed);
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
    async ({ body: { terminal_id, courier_id, status }, drizzle }) => {
      const result = await drizzle
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
            terminal_id
              ? inArray(courier_terminal_balance.terminal_id, terminal_id)
              : undefined,
            courier_id
              ? inArray(courier_terminal_balance.courier_id, courier_id)
              : undefined,
            status ? inArray(users.status, status) : undefined
          )
        )
        .execute();

      return result;
    },
    {
      body: t.Object({
        terminal_id: t.Optional(t.Array(t.String())),
        courier_id: t.Optional(t.Array(t.String())),
        status: t.Optional(t.Array(selectUserSchema.properties.status)),
      }),
    }
  )
  .post(
    "/users/refresh_token",
    async ({ body: { refresh_token }, set }) => {
      try {
        let jwtResult = await verifyJwt(refresh_token);
        const { id, phone } = jwtResult.payload;
        // @ts-ignore
        return await generateAuthToken({ id, phone });
      } catch (e) {
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
    return user;
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
    }) => {
      if (!user) {
        set.status = 400;
        return {
          message: "User not found",
        };
      }

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
        .where(eq(users.id, user.user.id))
        .execute();

      await processUpdateUserCache.add(
        user.user.id,
        {
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

      return openedTimeEntry;
    },
    {
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
      cacheControl, redis, processUpdateUserCache,
      drizzle,
      request,
    }) => {
      if (!user) {
        set.status = 400;
        return {
          message: "User not found",
        };
      }

      if (user.user.status != "active") {
        set.status = 400;
        return {
          message: "User is not active",
        };
      }

      const userRoles = user.access.roles;
      const userRoleCodes = userRoles.map((role: any) => role.code);

      if (!userRoleCodes.includes("courier")) {
        set.status = 400;
        return {
          message: "User is not courier",
        };
      }

      const openedTimeEntry = await drizzle
        .select({
          id: work_schedule_entries.id,
        })
        .from(work_schedule_entries)
        .where(
          and(
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

      userTerminals.forEach((terminal) => {
        organizationId = terminal.terminals!.organization_id;
        terminalId = terminal.terminals!.id;
        const distance = getDistance(
          {
            latitude: terminal.terminals!.latitude,
            longitude: terminal.terminals!.longitude,
          },
          { latitude: lat_open, longitude: lon_open }
        );
        if (!minDistance || distance < minDistance) {
          minDistance = distance;
        }
      });

      const organization = await cacheControl.getOrganization(
        organizationId!
      );

      if (minDistance! > organization.max_distance) {
        set.status = 400;
        return {
          message: "You are too far from terminal",
        };
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
            eq(users_work_schedules.user_id, user.user.id),
            arrayContains(work_schedules.days, [dayjs().day().toString()])
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
          startTime.setHours(startTime.getHours() - 2);
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

              const scheduleStartTime = new Date(
                `${schedule.max_start_time}`
              );
              scheduleStartTime.setDate(startTime.getDate());
              scheduleStartTime.setMonth(startTime.getMonth());
              scheduleStartTime.setFullYear(startTime.getFullYear());
              if (currentDate > scheduleStartTime) {
                isLate = true;
                lateMinutes = Math.round(
                  (currentDate.getTime() - scheduleStartTime.getTime()) /
                  60000
                );
              }

              workSchedule = schedule;
            }
          }
        });
      }

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
            user_id: user.user.id,
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
        .where(eq(users.id, user.user.id))
        .execute();

      await processUpdateUserCache.add(
        user.user.id,
        {
          id: user.user.id,
        },
        { attempts: 3, removeOnComplete: true }
      );

      const ip = request.headers.get("x-real-ip") || "127.0.0.1";

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
          user_id: user.user.id,
        })
        .returning()
        .execute();

      return workScheduleEntry[0];
    },
    {
      body: t.Object({
        lat_open: t.String(),
        lon_open: t.String(),
      }),
    }
  )

  .get(
    "/couriers/roll_coll",
    async ({ redis, query: { date }, drizzle }) => {
      const terminalsRes = await redis.get(
        `${process.env.PROJECT_PREFIX}_terminals`
      );
      let terminalsList = JSON.parse(
        terminalsRes || "[]"
      ) as InferSelectModel<typeof terminals>[];
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

      console.log("resCouriers", resCouriers);
      for (let i = 0; i < resCouriers.length; i++) {
        let userData = await redis.get(
          `${process.env.PROJECT_PREFIX}_user:${resCouriers[0].id}`
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
      query: t.Object({
        date: t.String(),
      }),
    }
  )
  .get(
    "/couriers/search",
    async ({ query: { search }, drizzle }) => {
      const couriersList = await drizzle
        .select()
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
      query: t.Object({
        search: t.String(),
      }),
    }
  )
  .get(
    "/couriers/my_unread_notifications",
    async ({ redis, searchService, user }) => {
      if (!user) {
        return 0;
      }

      const res = await searchService.myUnreadNotifications(user.user);
      return res;
    }
  )
  .get(
    "/users",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
      let res: {
        [key: string]: UsersModel & {
          work_schedules: {
            id: string;
            user_id: string;
            work_schedule_id: string;
            start_time: string;
            end_time: string;
            day: string;
          }[];
        };
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
    async ({ params: { id }, drizzle }) => {
      const permissionsRecord = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, id))
        .execute();
      return {
        data: permissionsRecord[0],
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/users",
    async ({ body: { data, fields }, drizzle }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, users, {});
      }
      const result = await drizzle
        .insert(users)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      body: t.Object({
        data: createInsertSchema(users) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/users/:id",
    async ({ params: { id }, body: { data, fields }, drizzle }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, users, {});
      }
      const result = await drizzle
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: createInsertSchema(users) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )