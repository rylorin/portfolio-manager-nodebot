export const StrategySetting = {
  Off: 0,
  On: 1,
} as const;
export type StrategySetting = (typeof StrategySetting)[keyof typeof StrategySetting];

export const strategy2String = (strategy: StrategySetting): string => {
  const item = Object.entries(StrategySetting).find((item) => item[1] == strategy);
  return item ? item[0] : "-";
};
