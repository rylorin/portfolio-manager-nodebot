import { LoaderFunctionArgs } from "react-router-dom";
import { Position } from "../../../../models";
import { PositionEntry } from "../../../../routers/positions.types";

/**
 * Load all positions
 * @param param0
 * @returns
 */
export const positionsIndexLoader = async ({ params }: LoaderFunctionArgs): Promise<PositionEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/index`)
    .then(async (response) => response.json())
    .then((data) => data.positions as PositionEntry[]);
};

/**
 * Load options positions
 * @param param0
 * @returns
 */
export const positionsOptionsLoader = async ({ params }: LoaderFunctionArgs): Promise<PositionEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/index`)
    .then(async (response) => response.json())
    .then((data: { positions: PositionEntry[] }) => data.positions.filter((item) => item.contract.secType == "OPT"));
};

/**
 * Fetch a position
 * @param param0
 * @returns
 */
export const positionShowLoader = async ({ params }: LoaderFunctionArgs): Promise<Position> => {
  const { portfolioId, positionId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}`)
    .then(async (response) => response.json())
    .then((data) => data.position as Position);
};
