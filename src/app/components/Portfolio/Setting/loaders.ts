import { ContractEntry, SettingEntry } from "@/routers";
import { LoaderFunctionArgs } from "react-router-dom";

/**
 * Load a setting
 * @param param0
 * @returns
 */
export const settingLoader = async ({ params }: LoaderFunctionArgs): Promise<{ setting: SettingEntry }> => {
  const { portfolioId, settingId } = params;
  return fetch(`/api/portfolio/${portfolioId}/settings/${settingId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => ({ setting: data.setting as SettingEntry }));
};

/**
 * Load a setting for edit
 * @param param0
 * @returns
 */
export const settingEditLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<{ setting: SettingEntry; contracts: ContractEntry[] }> => {
  const { portfolioId, settingId } = params;
  return fetch(`/api/portfolio/${portfolioId}/settings/${settingId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.setting as SettingEntry)
    .then(async (setting) =>
      fetch("/api/repository/stocks/")
        .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
        .then((data) => data.contracts as ContractEntry[])
        .then((contracts) => ({ setting, contracts })),
    );
};

/**
 * Load a setting for create
 * @param param0
 * @returns
 */
export const settingNewLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<{ setting: SettingEntry; contracts: ContractEntry[] }> => {
  const { _portfolioId } = params;
  return fetch("/api/repository/stocks/")
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.contracts as ContractEntry[])
    .then((contracts) => ({
      setting: { underlying: contracts[0], stock_id: contracts[0].id } as SettingEntry,
      contracts,
    }));
};
