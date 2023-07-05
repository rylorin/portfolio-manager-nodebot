import { LoaderFunctionArgs } from "react-router-dom";
import { Position } from "../../../../models";
import { PositionEntry } from "../../../../routers/positions.types";

/**
 * Load all positions
 * @param param0
 * @returns
 */
export const positionsIndexLoader = ({ params }: LoaderFunctionArgs): Promise<PositionEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/index`)
    .then((response) => response.json())
    .then((data) => data.positions as PositionEntry[]);
};

/**
 * Load options positions
 * @param param0
 * @returns
 */
export const positionsOptionsLoader = ({ params }: LoaderFunctionArgs): Promise<PositionEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/index`)
    .then((response) => response.json())
    .then((data: { positions: PositionEntry[] }) => data.positions.filter((item) => item.contract.secType == "OPT"));
};

/**
 * Fetch a position
 * @param param0
 * @returns
 */
export const positionShowLoader = ({ params }: LoaderFunctionArgs): Promise<Position> => {
  const { portfolioId, positionId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}`)
    .then((response) => response.json())
    .then((data) => data.position as Position);
};
