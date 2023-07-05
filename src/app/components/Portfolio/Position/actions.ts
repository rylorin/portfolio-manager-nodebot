import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Save a position
 * @param params
 * @returns
 */
export const positionSave = ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const data = Object.fromEntries(formData);
      // console.log("data:", data);
      return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}/SavePosition`, {
        method: "POST",
        headers: {
          // Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Delete a position
 * @param params
 * @returns
 */
export const positionDelete = ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId } = params;
  return request
    .formData()
    .then((_formData: Iterable<readonly [PropertyKey, any]>) => {
      return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}/DeletePosition`);
    })
    .then((response: Response) => response.text())
    .then((_data) => redirect("../"));
};

/**
 * Guess the (existing) trade of a position
 * @param params
 * @returns
 */
export const positionGuessTrade = ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/positions/${positionId}/GuessTrade`);
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Add a position to a given trade
 * @param param
 * @returns
 */
export const positionAddToTrade = ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId, tradeId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/positions/${positionId}/AddToTrade/${tradeId}`);
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};
