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
  getTableColumns,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  desc
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
import { List, sortBy, uniq } from "lodash";
import { getSetting } from "@api/src/utils/settings";

import customParseFormat from "dayjs/plugin/customParseFormat";
import { ctx } from "@api/src/context";
import { CourierEfficiencyReportItem, UsersModel, WalletStatus } from "./dto/list.dto";
dayjs.extend(customParseFormat);


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
  name: "@app/users",
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
    async ({
      body: { terminal_id, courier_id, status },
      drizzle,
      user,
      set,
    }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("orders.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      console.log('ff', JSON.stringify({
        terminal_id: terminal_id,
        courier_id: courier_id,
        status: status,
      }))
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
      cacheControl,
      redis,
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

      const organization = await cacheControl.getOrganization(organizationId!);

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
    async ({ redis, query: { date }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("terminals.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
  .get('/couriers/roll_call/:id', async ({ params: { id }, query: { startDate, endDate }, drizzle, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("terminals.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }

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
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }
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
      query: t.Object({
        search: t.String(),
      }),
    }
  )
  .get("/couriers/all", async ({ drizzle, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }
    const { password, ...fields } = getTableColumns(users);
    const couriersList = await drizzle
      .select(fields)
      .from(users)
      .leftJoin(users_roles, eq(users.id, users_roles.user_id))
      .leftJoin(roles, eq(users_roles.role_id, roles.id))
      .where(and(eq(users.status, "active"), eq(roles.code, "courier")))
      .execute() as InferSelectModel<typeof users>[];
    return couriersList;
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
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("users.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("users.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("users.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
        .values(fieldValues)
        .returning(selectFields);

      const createdUser = result[0];

      await drizzle
        .insert(users_roles)
        .values({
          user_id: createdUser.id,
          role_id: roles,
        })
        .execute();

      if (usersTerminals) {
        await drizzle
          .insert(users_terminals)
          .values(usersTerminals.map(terminal_id => ({
            user_id: createdUser.id,
            terminal_id,
          })))
          .execute();
      }

      if (usersWorkSchedules) {
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
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("users.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
          daily_garant_id: t.Optional(t.String()),
          max_active_order_count: t.Optional(t.Nullable(t.Number())),
          card_name: t.Optional(t.Nullable(t.String())),
          card_number: t.Optional(t.Nullable(t.String())),
          car_model: t.Optional(t.Nullable(t.String())),
          car_number: t.Optional(t.Nullable(t.String())),
          order_start_date: t.Optional(t.Nullable(t.String())),
        }),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .post('/couriers/efficiency', async ({ body: { startDate, endDate, courier_id, terminal_id, status }, drizzle, user, set, cacheControl }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("orders.edit")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }

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
    query.forEach((item) => {
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
    query.forEach((item) => {
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
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courier_id: t.Optional(t.String()),
      terminal_id: t.Optional(t.Array(t.String())),
      status: t.Optional(t.Union([t.Literal('active'), t.Literal('inactive'), t.Literal('blocked')])),
    })
  })
  .post('/couriers/efficiency/hour', async ({ body: { startDate, endDate, courierId }, drizzle, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("users.edit")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }


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
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courierId: t.String()
    })
  })
  .post('/couriers/efficiency/period', async ({ body: { startDate, endDate, courierId }, drizzle, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("users.edit")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }


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
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courierId: t.String()
    })
  })
  .get('/couriers/for_terminal', async ({ query: { terminal_id }, drizzle, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("users.edit")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }

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
    query: t.Object({
      terminal_id: t.String()
    })
  })
  .get('/couriers/my_profile_number', async ({ drizzle, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    const numbersResponse = await fetch(`${process.env.DUCK_API}/couriers/profile_numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courierId: user.user.id
      })
    });

    const numbers = await numbersResponse.json();

    return numbers;
  })
  .get('/couriers/mob_stat', async ({ drizzle, user, set, redis, cacheControl }) => {

    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }
    let workStartHour = await getSetting(redis, "work_start_time");
    workStartHour = new Date(workStartHour).getHours();

    let workEndHour = await getSetting(redis, "work_end_time");
    workEndHour = new Date(workEndHour).getHours();

    const orderStatuses = await cacheControl.getOrderStatuses();

    const finishedStatusIds = orderStatuses.filter((status) => status.finish).map((status) => status.id);
    const canceledStatusIds = orderStatuses.filter((status) => status.cancel).map((status) => status.id);

    const numbersResponse = await fetch(`${process.env.DUCK_API}/couriers/mobile_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courierId: user.user.id,
        startHour: workStartHour,
        endHour: workEndHour,
        finishedStatusIds,
        canceledStatusIds
      })
    });

    const numbers = await numbersResponse.json();

    return numbers;
  })
  .get('/couriers/my_couriers', async ({ drizzle, user, set, cacheControl }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

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
  })
  .post('/couriers/store-location', async ({ body: { lat, lon, app_version }, drizzle, user, set, processCourierStoreLocationQueue }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.user.is_online) {
      return {
        success: true,
      }
    }

    await processCourierStoreLocationQueue.add(`${lat}_${lon}_${new Date().getTime()}`, {
      lat,
      lon,
      app_version,
      user_id: user.user.id
    }, {
      attempts: 3, removeOnComplete: true

    });

    return {
      message: "Location updated",
      success: true
    };
  }, {
    body: t.Object({
      lat: t.String(),
      lon: t.String(),
      app_version: t.String()
    })
  })
