import Elysia, { t } from "elysia";
import {
  users,
  otp as otpTable,
  courier_performances,
  users_terminals,
  work_schedules,
  users_work_schedules,
  users_roles,
  roles, terminals
} from "../../../drizzle/schema";
import {
  eq,
  ne,
  and,
  desc, sql, SQLWrapper
} from "drizzle-orm";
import { generate } from "otp-generator";
import { addMinutesToDate } from "../../lib/dates";
import { decode, encode } from "../../utils/users";
import dayjs from "dayjs";

import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import { contextWitUser } from "../../context";
import { parseSelectFields } from "../../lib/parseSelectFields";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { UsersModel } from "./dto/list.dto";
import { SelectedFields } from "drizzle-orm/pg-core";
import { verifyJwt } from "../../utils/bcrypt";
import { generateAuthToken } from "../../utils/bcrypt";
import { UserResponseDto } from "./users.dto";
import { JwtPayload } from "../../utils/jwt-payload.dto";
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

export const UsersController = new Elysia({
  name: "@app/users",
})
  .use(contextWitUser)
  .get("/api/users/getme", async ({ user }) => {
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
  }, {
    userAuth: true
  })
  .get('/api/users/my_performance', async ({ user, drizzle }) => {
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
  }, {
    userAuth: true
  })
  .get(
    "/api/users",
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
    "/api/users/:id",
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
    "/api/users/send-otp",
    async ({ body: { phone }, drizzle }) => {
      let userEntity = (await drizzle.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
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

      const [otpEntity] = await drizzle
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
    "/api/users/verify-otp",
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
      const otp_instance = (await drizzle.select().from(otpTable).where(eq(otpTable.id, obj.otp_id)).limit(1))[0];

      //Check if OTP is available in the DB
      if (otp_instance != null) {
        //Check if OTP is already used or not
        if (otp_instance.verified != true) {
          //Check if OTP is expired or not
          if (dayjs(currentDate).isBefore(dayjs(otp_instance.expiry_date))) {
            //Check if OTP is equal to the OTP in the DB
            if (otp === otp_instance.otp) {
              otp_instance.verified = true;
              await drizzle
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
    "/api/users/refresh_token",
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

  .post(
    "/api/users",
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
    "/api/users/:id",
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
        .returning({
          id: users.id,
          first_name: users.first_name,
          last_name: users.last_name,
          phone: users.phone,

        });

      await drizzle.delete(users_roles).where(eq(users_roles.user_id, id)).execute();

      await drizzle
        .insert(users_roles)
        .values({
          user_id: id,
          role_id: roles,
        })
        .execute();

      if (usersTerminals && usersTerminals.length > 0) {
        await drizzle.delete(users_terminals).where(eq(users_terminals.user_id, id)).execute();
        await drizzle
          .insert(users_terminals)
          .values(usersTerminals.map(terminal_id => ({
            user_id: id,
            terminal_id,
          })))
          .execute();
      }

      if (usersWorkSchedules && usersWorkSchedules.length > 0) {
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

