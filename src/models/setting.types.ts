export const StrategySetting = {
  Off: 0,
  On: 1,
} as const;
export type StrategySetting = (typeof StrategySetting)[keyof typeof StrategySetting];

export const strategy2String = (strategy: StrategySetting): string => {
  const item = Object.entries(StrategySetting).find((item) => item[1] == strategy);
  return item ? item[0] : "-";
};

export const CspStrategySetting = {
  Off: 0,
  Cash: 1,
  Nav: 2,
} as const;
export type CspStrategySetting = (typeof CspStrategySetting)[keyof typeof CspStrategySetting];

export const cspStrategy2String = (strategy: CspStrategySetting): string => {
  const item = Object.entries(CspStrategySetting).find((item) => item[1] == strategy);
  return item ? item[0] : "-";
};
