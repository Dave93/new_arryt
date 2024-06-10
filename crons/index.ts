import { scheduled_reports, scheduled_reports_subscription, users, work_schedule_entries, work_schedule_entry_status } from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import Cron from "croner";
import dayjs from "dayjs";
import { and, eq, sql, isNotNull, inArray } from "drizzle-orm";
import Redis from 'ioredis';
import _ from 'lodash';
import { sendCourierWithdrawsReport } from "./send_courier_withdraws_report";


export const redisClient = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

const cacheControl = new CacheControlService(db, redisClient);

const userByPhone = db.query.users
    .findFirst({
        where: (users, { eq }) => eq(users.phone, sql.placeholder("phone")),
    })
    .prepare("userByPhone");

const balanceReportSendJob = Cron('30 10 * * *', {
    name: 'balance_report_send'
}, async () => {

    const courierTerminalBalance = await db.execute<{
        id: string;
        balance: number;
        courier_id: string;
        terminal_id: string;
        last_name: string;
        first_name: string;
        name: string;
    }>(sql.raw(`select ctb.id, ctb.balance, ctb.courier_id, ctb.terminal_id, u.last_name, u.first_name, t.name
        from courier_terminal_balance ctb
        left join users u on ctb.courier_id = u.id
        left join terminals t on ctb.terminal_id = t.id
        where ctb.balance > 0 and u.status = 'active' and u.phone != '+998908251218'
        order by ctb.balance desc`));

    // group by terminal name using lodash
    const groupedByTerminal = _.groupBy(courierTerminalBalance, 'terminal_id');

    let html = `<b>Список курьеров с положительным балансом</b>`;
    // loop through each terminal
    for (const terminal_id in groupedByTerminal) {
        if (groupedByTerminal.hasOwnProperty(terminal_id)) {
            const terminal = groupedByTerminal[terminal_id];
            html += `\n\n<b>${terminal[0].name}</b>\n`;
            // loop through each courier
            for (const courier of terminal) {
                html += `${courier.first_name} ${courier.last_name
                    } -- ${Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'UZS',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(courier.balance)}\n`;
            }
        }
    }

    const apiToken = process.env.BOT_API_TOKEN;

    const buff = Buffer.from(`${apiToken}`);
    const base64data = buff.toString('base64');
    // random string with 6 characters
    const randomString = Math.random().toString(36).substring(2, 8);
    const hexBuffer = Buffer.from(`${randomString}${base64data}`);
    const hex = hexBuffer.toString('hex');

    const chatIds = process.env.BALANCE_REPORT_GROUPS?.split(',') ?? [];
    for (const chatId of chatIds) {
        await fetch(`https://order-tg.choparpizza.uz/message`, {
            method: 'POST',
            headers: {
                'Accept-Language': 'ru',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${hex}`,
            },
            body: JSON.stringify({
                chat_id: +chatId,
                text: html,
            }),
        });
    }
});

const closeOpenedTimesJob = Cron('0 5 * * *', {
    name: 'close_opened_times'
}, async () => {

    const openTimeEntries = await db.select({
        id: work_schedule_entries.id,
        date_start: work_schedule_entries.date_start,
        user_id: work_schedule_entries.user_id,
    })
        .from(work_schedule_entries)
        .where(
            eq(work_schedule_entries.current_status, "open")
        );

    for (const openTimeEntry of openTimeEntries) {
        try {
            const dateStart = new Date(openTimeEntry.date_start);
            const dateEnd = new Date();
            // get duration in seconds
            const duration = Math.floor((dateEnd.getTime() - dateStart.getTime()) / 1000);
            await db.update(work_schedule_entries).set({
                ip_close: '127.0.0.1',
                current_status: "closed",
                duration,
                date_finish: new Date().toISOString(),
            }).where(eq(work_schedule_entries.id, openTimeEntry.id));
            // await this.prismaService.work_schedule_entries.update({
            //     where: {
            //         id: openTimeEntry.id,
            //     },
            //     data: {
            //         ip_close: '127.0.0.1',
            //         current_status: work_schedule_entry_status.closed,
            //         duration,
            //         date_finish: new Date(),
            //     },
            // });

            await db.update(users).set({
                is_online: false,
            }).where(eq(users.id, openTimeEntry.user_id));

            redisClient.hdel(`${process.env.PROJECT_PREFIX}_user_location`, openTimeEntry.user_id);
        } catch (e) { }
    }
});

const sendBalanceReportBotJob = Cron('*/10 * * * *', {
    name: 'send_balance_report_bot'
}, async () => {
    const reportSubscribers = await db.select({
        user_id: scheduled_reports_subscription.user_id,
        scheduled_reports: {
            code: scheduled_reports.code,
        },
    })
        .from(scheduled_reports_subscription)
        .leftJoin(scheduled_reports, eq(scheduled_reports_subscription.report_id, scheduled_reports.id))
        .execute();

    const subscribersUserIds = reportSubscribers
        .map((subscriber) => subscriber.user_id)
        .filter((value, index, self) => self.indexOf(value) === index);

    const usersList = await db.select({
        id: users.id,
        tg_id: users.tg_id,
    })
        .from(users)
        .where(
            and(
                eq(users.status, 'active'),
                isNotNull(users.tg_id),
                inArray(users.id, subscribersUserIds)
            )
        )
        .execute();

    const activeUserIds = usersList.map((user) => user.id);

    const tgIdByUserId: Record<string, string> = usersList.reduce((acc, user) => ({
        ...acc,
        [user.id]: user.tg_id,
    }), {});

    const activeSubscribers = reportSubscribers.filter((subscriber) => activeUserIds.includes(subscriber.user_id));

    const reportCodes: Record<string, string[]> = {};

    activeSubscribers.forEach((subscriber) => {
        if (!reportCodes[subscriber.scheduled_reports!.code]) {
            reportCodes[subscriber.scheduled_reports!.code] = [];
        }
        reportCodes[subscriber.scheduled_reports!.code].push(tgIdByUserId[subscriber.user_id]);
    });

    Object.keys(reportCodes).forEach((reportCode) => {
        switch (reportCode) {
            case 'courier_withdraws':
                sendCourierWithdrawsReport(reportCodes[reportCode], cacheControl);
                break;
            default:
                break;
        }
    });

    return true;
});