import cronParser, { DayOfTheMonthRange, DayOfTheWeekRange, HourRange, MonthRange, SixtyRange } from "cron-parser";

export function isTimeMatches(cronExpression: string, date: Date): boolean {
    var interval = cronParser.parseExpression(cronExpression);
    var data = interval.fields;

    if (!data.second.includes(date.getSeconds() as SixtyRange)) {
        return false;
    }
    if (!data.minute.includes(date.getMinutes() as SixtyRange)) {
        return false;
    }
    if (!data.hour.includes(date.getHours() as HourRange)) {
        return false;
    }
    if (!data.dayOfMonth.includes(date.getDate() as DayOfTheMonthRange)) {
        return false;
    }
    if (!data.month.includes((date.getMonth() + 1) as MonthRange)) {
        return false;
    }
    if (!data.dayOfWeek.includes(date.getDay() as DayOfTheWeekRange)) {
        return false;
    }
    return true;
}
