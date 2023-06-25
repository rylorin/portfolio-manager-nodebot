export const obfuscate = (text: string): string => {
  const len: number = text ? text.length : 0;
  return len < 4 ? "****" : text.slice(0, 2) + "*".repeat(len - 4) + text.slice(len - 2, len);
};

export const formatNumber = (value: number | undefined, decimals = 0): string => {
  return value
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : "-";
};
