import { db } from "@api/src/lib/db";
import { eq, sql } from "drizzle-orm";
import { work_schedule_entries, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import _ from 'lodash';

export const redisClient = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

async function main() {
    try {
        const courierTerminalBalance = (await db.execute<{
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
            order by ctb.balance desc`))).rows;
    // console.log('courierTerminalBalance', courierTerminalBalance);
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

        console.log('Everything is done');
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        // Close the Redis connection
        await redisClient.quit();
        // If you're using a connection pool with your database, you may need to close it here as well
        // For example: await db.end()
        process.exit(0);
    }
}

main();