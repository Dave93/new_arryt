export const addMinutesToDate = (date: Date, minutes: number) => {
  return new Date(date.getTime() + minutes * 60000);
};
