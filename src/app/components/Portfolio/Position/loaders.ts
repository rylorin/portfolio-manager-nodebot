import { LoaderFunctionArgs } from "react-router-dom";
import { ContractType } from "../../../../models/contract.types";
import { OptionPositionEntry, PositionEntry } from "../../../../routers/";

/**
 * Load all positions
 * @param param0
 * @returns
 */
export const positionsIndexLoader = async ({ params }: LoaderFunctionArgs): Promise<PositionEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/index`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.positions as PositionEntry[]);
};

/**
 * Load options positions
 * @param param0
 * @returns
 */
export const positionsOptionsLoader = async ({ params }: LoaderFunctionArgs): Promise<OptionPositionEntry[]> => {
  const { portfolioId } = params;
  return (
    fetch(`/api/portfolio/${portfolioId}/positions/index`)
      .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
      // .then((data: { positions: PositionEntry[] }) => {
      //   console.log(data.positions);
      //   return data;
      // })
      .then(
        (data: { positions: PositionEntry[] }) =>
          data.positions.filter(
            (item) =>
              item.contract.secType == ContractType.Option || item.contract.secType == ContractType.FutureOption,
          ) as OptionPositionEntry[],
      )
  );
};

/**
 * Fetch a position
 * @param param0
 * @returns
 */
export const positionShowLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<PositionEntry | OptionPositionEntry> => {
  const { portfolioId, positionId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.position as PositionEntry | OptionPositionEntry);
};
