export const SettingLink = {
  toIndex: (portfolioId: number | string): string => `/portfolio/${portfolioId}/parameters`,
  toSetting: (portfolioId: number | string, itemId: number | string): string =>
    `/portfolio/${portfolioId}/parameters/${itemId}`,
  toSettingEdit: (portfolioId: number | string, itemId: number | string): string =>
    `/portfolio/${portfolioId}/parameters/${itemId}/edit`,
  toSettingDelete: (portfolioId: number | string, itemId: number | string): string =>
    `/portfolio/${portfolioId}/parameters/${itemId}/delete`,
  toSettingNew: (portfolioId: number | string): string => `/portfolio/${portfolioId}/parameters/create`,
};
