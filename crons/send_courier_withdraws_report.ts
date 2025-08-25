import { scheduled_reports, users, scheduled_reports_subscription, courier_terminal_balance, terminals } from "@api/drizzle/schema";
import { db, pool } from "@api/src/lib/db";
import { and, eq, inArray, isNotNull, sql, gt } from "@api/node_modules/drizzle-orm";
import { isTimeMatches } from "./istimematch";
import dayjs from "dayjs";
import cron from 'node-cron'
import { CacheControlService } from "@api/src/modules/cache/service";
import { sortBy } from "lodash";
import { encode } from "base64-arraybuffer";

import ExcelJS from 'exceljs';
import Redis from "ioredis";

export const redisClient = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

const cacheControl = new CacheControlService(db, redisClient);

const onlyThisTerminals = [
    '6c2ea284-6d75-4061-b93a-2a54a0a77085',
    'a65bbbd3-66c7-4d61-84ae-403009107154',
    '972b7402-345d-400e-9bf2-b77691b0fcd9',
    '56fe54a9-ae37-49b7-8de7-62aadb2abd19',
    '0bd34d62-f0b0-434c-a739-249cac440dad',
    '81f38bd9-5aa6-443d-8158-9c2207d70caf',
    '59946b39-71a9-465c-b155-c708d989f9a1',
    'ae73196e-3ddd-48c8-aeb8-d15c8bf48045',
    '419b466b-a575-4e2f-b771-7206342bc242',
    'f8bff3a8-651e-44dc-a774-90129a3487eb',
    '4a8e1810-d549-42e2-829e-c8dd4046dc32',
    '897b987a-6675-4e68-bc0e-81abc21a1b43',
    '36f7a844-8a72-40c2-a1c5-27dcdc8c2efd',
    'b1a884a3-7096-4a8c-8425-8f824fbbf59c'
];

export const sendCourierWithdrawsReport = async (tgIds: string[], cacheControl: CacheControlService) => {
    const scheduledReport = (await db.select().from(scheduled_reports).where(eq(scheduled_reports.code, 'courier_withdraws')).limit(1).execute())[0];

    const crontabPattern = scheduledReport.cron;
    console.log('report crontabPattern', crontabPattern);
    // if (isTimeMatches(crontabPattern, new Date())) {
    // startDate using dayjs library 2 hours earlier
    // const startDate = dayjs().startOf('d').toISOString();
    const sentReports = await (Bun.file('./sent_reports.json')).json();
    const startDate = dayjs().startOf('d').toISOString();
    const endDate = dayjs().endOf('d').toISOString();
    // const existingSentReport = await this.searchService.getSentReportByCodeAndDate(
    //     'courier_withdraws',
    //     startDate,
    //     endDate,
    // );

    if (sentReports['courier_withdraws'].includes(dayjs().format('DD.MM.YYYY'))) {
        return;
    }
    console.log('report query')
    // if (existingSentReport && existingSentReport.length > 0) {
    //     return;
    // }
    const terminalCondition = onlyThisTerminals.length > 0
        ? `AND ot.terminal_id IN ('${onlyThisTerminals.join("','")}')`
        : `AND 1=1`;
    const workStartTime = new Date(await cacheControl.getSetting('work_start_time')).getHours();
    const workEndTime = new Date(await cacheControl.getSetting('work_end_time')).getHours();
    const orderTransactions = (await db.execute<{
        total: number;
        courier_id: string;
        courier_name: string;
        terminal_id: string;
        terminal_name: string;
    }>(sql.raw(`select 
            sum(ot.amount) as total,
            ot.courier_id,
            concat(u.last_name, ' ', u.first_name) as courier_name,
            ot.terminal_id,
            t.name as terminal_name
        from order_transactions ot
        left join users u on ot.courier_id = u.id
        left join terminals t on ot.terminal_id = t.id
        where ot.created_at >= '${dayjs().subtract(1, 'day').hour(workStartTime).toISOString()}' and ot.created_at <= '${dayjs().hour(workEndTime).toISOString()}'
        ${terminalCondition}
        group by ot.courier_id, u.last_name, u.first_name, ot.terminal_id, t.name`))).rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Courier withdraws');

    worksheet.columns = [
        { header: 'Филиал', key: 'terminal_name', width: 30 },
        { header: 'Курьер', key: 'courier_name', width: 30 },
        { header: 'Сумма', key: 'total', width: 30 },
        { header: 'Остаток в кошельке', key: 'balance', width: 30 },
    ];

    console.log('orderTransactions', orderTransactions);
    const result = sortBy(orderTransactions, 'terminal_name');

    let courierIds: string[] = [];
    result.forEach((item) => {
        courierIds.push(item.courier_id);
    });

    const courierTerminalBalance = await db
      .select({
        id: courier_terminal_balance.id,
        balance: courier_terminal_balance.balance,
        terminal_id: courier_terminal_balance.terminal_id,
        terminal_name: terminals.name,
        terminal_address: terminals.address,
        courier_last_name: users.last_name,
        courier_first_name: users.first_name,
      })
      .from(courier_terminal_balance)
      .leftJoin(terminals, eq(courier_terminal_balance.terminal_id, terminals.id))
      .leftJoin(users, eq(courier_terminal_balance.courier_id, users.id))
      .where(
        and(
            inArray(courier_terminal_balance.courier_id, courierIds),
            gt(courier_terminal_balance.balance, 0)
        )
      );

    let courierTerminalBalanceMap: Map<string, number> = new Map();

    courierTerminalBalance.forEach((item) => {
        let key = `${item.courier_last_name} ${item.courier_first_name} ${item.terminal_name}`;
        courierTerminalBalanceMap.set(key, item.balance);
    });

    result.forEach((item) => {
        let key = `${item.courier_name} ${item.terminal_name}`;
        let balance = courierTerminalBalanceMap.get(key) || 0;
        worksheet.addRow({
            terminal_name: item.terminal_name || '',
            courier_name: item.courier_name || '',
            total: Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'UZS',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(item.total).replace('UZS', '').trim() || 0,
            balance: Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'UZS',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(balance).replace('UZS', '').trim() || 0
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    // console.log('file buffer', buffer);
    const fileName = `Выплаты курьерам ${dayjs().subtract(1, 'day').format('DD.MM.YYYY')}.xlsx`;
    // send to telegram
    const sendFileUrl = `${process.env.REPORT_BOT_API_URL}/sendFile`;
    // send tgIds, buffer and fileName using axios post request in multipart/form-data format
    const formData = new FormData();
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    formData.append('file', encode(buffer));
    formData.append('tgIds', tgIds.join(','));
    formData.append('fileName', fileName);

    await fetch(sendFileUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.REPORT_BOT_API_TOKEN}`,
        },
        body: formData,
    });

    // const sendFileResponse = await axios.post(sendFileUrl, formData, {
    //     headers: formData.getHeaders(),
    // });

    // // save sent report to elasticsearch
    // await this.searchService.saveSentReport({
    //     report_code: 'courier_withdraws',
    //     created_at: new Date(),
    // });

    sentReports['courier_withdraws'].push(dayjs().format('DD.MM.YYYY'));
    await Bun.write('./sent_reports.json', JSON.stringify(sentReports));

    return true;

    // }
}

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

try {
    for (const reportCode of Object.keys(reportCodes)) {
        switch (reportCode) {
            case 'courier_withdraws':
                await sendCourierWithdrawsReport(reportCodes[reportCode], cacheControl);
                break;
            default:
                break;
        }
    }
} finally {
    // Close connections after all operations are done

    await redisClient.quit();
    process.exit(0);
}


