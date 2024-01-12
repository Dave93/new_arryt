import dayjs from "dayjs";

export function getMinutes(str: string) {
    const time = str.split(':');
    return +time[0] * 60 + +time[1] * 1;
}
export function getMinutesNow() {
    const timeNow = new Date();
    // timeNow.setHours(timeNow.getHours() + 4);
    return timeNow.getHours() * 60 + timeNow.getMinutes();
}


export const addMinutesToDate = (date: Date, minutes: number) => {
    return new Date(date.getTime() + minutes * 60000);
};

export const getHours = (str: string) => {
    const time = str.split(':');
    console.log('time', time)
    if (isNaN(+time[0])) {
        return dayjs(str).hour();
    } else {
        return +time[0];
    }
}