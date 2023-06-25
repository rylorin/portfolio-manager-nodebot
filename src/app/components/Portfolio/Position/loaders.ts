import { Position } from "../../../../models";

/**
 * Load all positions
 * @param param0
 * @returns
 */
export const positionsIndexLoader = ({ params }): Promise<Position[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/index`)
    .then((response) => response.json())
    .then((data) => data.positions);
};

/**
 * Load options positions
 * @param param0
 * @returns
 */
export const positionsOptionsLoader = ({ params }): Promise<Position[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/options`)
    .then((response) => response.json())
    .then((data) => data.positions);
};

/**
 * Fetch a position
 * @param param0
 * @returns
 */
export const positionShowLoader = ({ params }): Promise<Position[]> => {
  const { portfolioId, positionId } = params;
  return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}`)
    .then((response) => response.json())
    .then((data) => data.position);
};