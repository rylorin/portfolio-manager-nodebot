export const PortfolioLink = {
  toIndex: (portfolioId: number | string): string => `/portfolio/${portfolioId}/parameters`,
  toSetting: (portfolioId: number | string, _itemId: number | string): string => `/portfolio/${portfolioId}/parameters`,
  toSettingEdit: (portfolioId: number | string, _itemId: number | string): string =>
    `/portfolio/${portfolioId}/parameters`,
};
