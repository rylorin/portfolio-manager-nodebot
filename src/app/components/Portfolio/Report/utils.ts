export const formatMonth = (year: number, month: number): string => {
  return `${year}-${month < 10 ? "0" : ""}${month}`;
};
