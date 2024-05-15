import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Save a position
 * @param params
 * @returns
 */
export const positionSave = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
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
    .then(async (response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Delete a position
 * @param params
 * @returns
 */
export const positionDelete = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId } = params;
  return request
    .formData()
    .then(async (_formData: Iterable<readonly [PropertyKey, any]>) => {
      return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}/DeletePosition`);
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../"));
};

/**
 * Guess the (existing) trade of a position
 * @param params
 * @returns
 */
export const positionGuessTrade = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/positions/${positionId}/GuessTrade`);
    })
    .then(async (response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Add a position to a given trade
 * @param param
 * @param request
 * @returns
 */
export const positionAddToTrade = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId, tradeId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/positions/${positionId}/AddToTrade/${tradeId}`);
    })
    .then(async (response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Unlink trade from position
 * @param params
 * @param request
 * @returns
 */
export const positionUnlinkTrade = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, positionId } = params;
  // console.log("positionUnlinkTrade", portfolioId, positionId);
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/positions/${positionId}/UnlinkTrade`);
    })
    .then(async (response: Response) => response.json())
    .then((_data) => redirect("../"));
};
