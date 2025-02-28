/** convert YYYYMMDD or YYYY-MM-DD to Date */
export const expirationToDate = (value: string | number): Date => {
  let lastTradeDateOrContractMonth: string;
  if (typeof value === "string") lastTradeDateOrContractMonth = value.replaceAll("-", "");
  else lastTradeDateOrContractMonth = `${value}`;
  const lastTradeDate = new Date(
    parseInt(lastTradeDateOrContractMonth.substring(0, 4)),
    parseInt(lastTradeDateOrContractMonth.substring(4, 6)) - 1,
    parseInt(lastTradeDateOrContractMonth.substring(6, 8)),
  );
  return lastTradeDate;
};

/** convert YYYYMMDD to YYYY-MM-DD */
export const expirationToDateString = (value: string | number): string => {
  let lastTradeDateOrContractMonth: string;
  if (!value) return null;
  if (typeof value === "string") lastTradeDateOrContractMonth = value;
  else lastTradeDateOrContractMonth = `${value}`;
  const lastTradeDate =
    lastTradeDateOrContractMonth.substring(0, 4) +
    "-" +
    lastTradeDateOrContractMonth.substring(4, 6) +
    "-" +
    lastTradeDateOrContractMonth.substring(6, 8);
  return lastTradeDate;
};

/** convert Date to YYYYMMDD */
export const dateToExpiration = (value?: Date): string => {
  if (!value) value = new Date();
  const day: number = value.getDate();
  const month: number = value.getMonth() + 1;
  const year: number = value.getFullYear();
  const lastTradeDate: string = year.toString() + (month < 10 ? "0" + month : month) + (day < 10 ? "0" + day : day);
  return lastTradeDate;
};

export const daysToExpiration = (lastTradeDate: string): number => {
  const [year, month, day] = new Date().toISOString().substring(0, 10).split("-");
  const now = new Date(+year, +month - 1, +day);
  const [yyyy, mm, dd] = lastTradeDate.split("-");
  const expiration = new Date(+yyyy, +mm - 1, +dd);
  return (expiration.getTime() - now.getTime()) / 60_000 / 1440;
};
