import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Create a new trade using current statement
 * @param params
 * @returns
 */
export const statementCreateTrade = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, statementId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/CreateTrade`);
    })
    .then(async (response: Response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((_data) => redirect("../"));
};

/**
 * Guess trade of current statement
 * @param params
 * @returns
 */
export const statementGuessTrade = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, statementId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/GuessTrade`);
    })
    .then(async (response: Response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((_data) => redirect("../"));
};

/**
 * Unlink current statement from trade
 * @param params
 * @param request
 * @returns
 */
export const statementUnlinkTrade = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, statementId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/UnlinkTrade`);
    })
    .then(async (response: Response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((_data) => redirect("../"));
};

/**
 * Add current statement to given trade
 * @param params
 * @returns
 */
export const statementAddToTrade = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, statementId, tradeId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/AddToTrade/${tradeId}`);
    })
    .then(async (response: Response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((_data) => redirect("../"));
};

/**
 * Delete a statement
 * @param params
 * @returns
 */
export const statementDelete = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, statementId } = params;
  // console.log("statementDelete", portfolioId, statementId);
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/DeleteStatement`, { method: "DELETE" });
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../"));
};

/**
 * Save a statement
 * @param params
 * @returns
 */
export const statementSave = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, statementId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const data = Object.fromEntries(formData);
      Object.keys(data).forEach((key) => {
        if (data[key] == "null") data[key] = null;
      });
      // console.log("data:", data);
      // const data_:Record<string,any>={}
      // for (const entry of formData) {
      //   if (entry[1]=="null") data[entry[0]]=null
      //   else data[0]
      // }
      return fetch(`/api/portfolio/${portfolioId}/statements/id/${statementId}/SaveStatement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    })
    .then(async (response: Response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((_data) => redirect("../"));
};
